/**
 * Tiny Web Audio beeper. iOS only allows audio after a user gesture, so
 * `installAudioUnlock()` resumes the context on every tap (cheap when already running).
 * Note: on iPhone, Web Audio follows the ring/silent switch.
 */
let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function unlock() {
  const c = getCtx();
  if (!c) return;
  if (c.state !== 'running') {
    c.resume().catch(() => {});
    // A silent buffer finalises the unlock on older iOS versions.
    const buf = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
  }
}

export function installAudioUnlock() {
  const opts = { capture: true, passive: true } as const;
  window.addEventListener('touchend', unlock, opts);
  window.addEventListener('pointerdown', unlock, opts);
  window.addEventListener('keydown', unlock, opts);
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export interface BeepOptions {
  freq?: number;
  durationMs?: number;
  volume?: number;
  /** Play a second, higher tone right after (used for "done" cues). */
  double?: boolean;
}

export function beep({ freq = 880, durationMs = 140, volume = 0.18, double = false }: BeepOptions = {}) {
  if (!enabled) return;
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const tone = (f: number, start: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    const t0 = c.currentTime + start;
    const t1 = t0 + durationMs / 1000;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  };
  tone(freq, 0);
  if (double) tone(freq * 1.5, durationMs / 1000 + 0.06);
}

export const cues = {
  tick: () => beep({ freq: 660, durationMs: 90, volume: 0.12 }),
  done: () => beep({ freq: 784, durationMs: 160, double: true }),
  gentle: () => beep({ freq: 523, durationMs: 220, volume: 0.14, double: true }),
};
