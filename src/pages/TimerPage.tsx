import { useAppStore } from '../store/AppStore';
import { elapsedMs, useNow } from '../lib/useNow';
import { useCrossing } from '../lib/useCrossing';
import { useWakeLock } from '../lib/wakeLock';
import { cues } from '../lib/audio';
import { formatClock, formatDuration } from '../lib/time';
import type { TimerState } from '../types';
import { Segmented, Stepper } from '../components/Controls';
import { IconCoffee, IconLap, IconPause, IconPlay, IconReset } from '../components/Icons';

const PRESETS = [30, 45, 60, 90, 120, 180, 300];

export default function TimerPage() {
  const { data, updateTimers } = useAppStore();
  const t = data.timers;
  const running = t.stopwatch.startedAt != null || t.countdown.startedAt != null || t.breakTimer.startedAt != null;
  useWakeLock(running);
  const now = useNow(running, 100);

  const cdMs = elapsedMs(t.countdown.startedAt, t.countdown.accumulatedMs, now);
  useCrossing(t.countdown.startedAt != null ? cdMs : null, t.countdown.durationSec * 1000, cues.done);
  const brMs = t.breakTimer.startedAt != null ? now - t.breakTimer.startedAt : null;
  const target = data.settings.targetBreakSec;
  useCrossing(brMs, target != null ? target * 1000 : null, cues.gentle);

  const set = (fn: (t: TimerState) => TimerState) => updateTimers(fn);

  return (
    <main className="main">
      <header className="page-header">
        <div>
          <h1>Timer</h1>
          <p className="muted small">For anything outside a guided session.</p>
        </div>
      </header>

      <Segmented
        full
        label="Timer type"
        value={t.tab}
        onChange={(tab) => set((x) => ({ ...x, tab }))}
        options={[
          { value: 'stopwatch', label: 'Stopwatch' },
          { value: 'countdown', label: 'Countdown' },
          { value: 'break', label: 'Break' },
        ]}
      />

      <div style={{ marginTop: 20 }}>
        {t.tab === 'stopwatch' && <Stopwatch now={now} />}
        {t.tab === 'countdown' && <Countdown elapsed={cdMs} />}
        {t.tab === 'break' && <BreakTimer elapsed={brMs} />}
      </div>
    </main>
  );
}

function Stopwatch({ now }: { now: number }) {
  const { data, updateTimers } = useAppStore();
  const sw = data.timers.stopwatch;
  const ms = elapsedMs(sw.startedAt, sw.accumulatedMs, now);
  const running = sw.startedAt != null;
  const upd = (patch: Partial<TimerState['stopwatch']>) => updateTimers((t) => ({ ...t, stopwatch: { ...t.stopwatch, ...patch } }));

  const toggle = () => {
    const at = Date.now();
    if (running) upd({ startedAt: null, accumulatedMs: elapsedMs(sw.startedAt, sw.accumulatedMs, at) });
    else upd({ startedAt: at });
  };

  return (
    <div className="stack-lg fade-in">
      <div className="card stack" style={{ alignItems: 'center', padding: '32px 16px' }}>
        <div className="timer-display" role="timer">
          {formatClock(ms)}
          <span style={{ fontSize: '0.4em', opacity: 0.55 }}>.{String(Math.floor((ms % 1000) / 100))}</span>
        </div>
      </div>
      <div className="row">
        <button type="button" className="icon-btn" aria-label="Reset" disabled={running || ms === 0} onClick={() => upd({ startedAt: null, accumulatedMs: 0, laps: [] })}>
          <IconReset />
        </button>
        <button type="button" className="btn primary big grow" onClick={toggle}>
          {running ? (
            <>
              <IconPause /> Pause
            </>
          ) : (
            <>
              <IconPlay /> {ms > 0 ? 'Resume' : 'Start'}
            </>
          )}
        </button>
        <button type="button" className="icon-btn" aria-label="Lap" disabled={!running} onClick={() => upd({ laps: [...sw.laps, elapsedMs(sw.startedAt, sw.accumulatedMs)] })}>
          <IconLap />
        </button>
      </div>
      {sw.laps.length > 0 && (
        <div className="card flat">
          <table className="set-table">
            <thead>
              <tr>
                <th>Lap</th>
                <th>Split</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sw.laps
                .map((total, i) => ({ i, total, split: total - (sw.laps[i - 1] ?? 0) }))
                .reverse()
                .map((l) => (
                  <tr key={l.i}>
                    <td>{l.i + 1}</td>
                    <td>{formatClock(l.split)}</td>
                    <td className="muted">{formatClock(l.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Countdown({ elapsed }: { elapsed: number }) {
  const { data, updateTimers } = useAppStore();
  const cd = data.timers.countdown;
  const running = cd.startedAt != null;
  const remaining = cd.durationSec * 1000 - elapsed;
  const finished = remaining <= 0;
  const upd = (patch: Partial<TimerState['countdown']>) => updateTimers((t) => ({ ...t, countdown: { ...t.countdown, ...patch } }));

  const toggle = () => {
    const at = Date.now();
    if (running) upd({ startedAt: null, accumulatedMs: elapsedMs(cd.startedAt, cd.accumulatedMs, at) });
    else if (finished) upd({ startedAt: at, accumulatedMs: 0 });
    else upd({ startedAt: at });
  };
  const fraction = cd.durationSec ? Math.min(1, Math.max(0, elapsed / (cd.durationSec * 1000))) : 0;
  const idle = !running && elapsed === 0;

  return (
    <div className="stack-lg fade-in">
      <div className="card stack" style={{ alignItems: 'center', padding: '32px 16px' }}>
        <div className={`timer-display${finished ? ' over' : ''}`} role="timer">
          {finished ? `+${formatClock(-remaining)}` : formatClock(Math.ceil(remaining / 1000) * 1000)}
        </div>
        <p className="target-line small">{finished ? "Time's up" : `of ${formatClock(cd.durationSec * 1000)}`}</p>
        <div className="progress" style={{ width: '100%' }}>
          <div style={{ width: `${fraction * 100}%` }} />
        </div>
      </div>

      {idle && (
        <div className="stack">
          <div className="chips" style={{ justifyContent: 'center' }}>
            {PRESETS.map((p) => (
              <button key={p} type="button" className="chip" aria-pressed={cd.durationSec === p} onClick={() => upd({ durationSec: p })}>
                {formatDuration(p)}
              </button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <span className="field-label">Seconds</span>
            <Stepper label="countdown seconds" min={5} max={5999} step={5} value={cd.durationSec} onChange={(v) => upd({ durationSec: v ?? 60 })} />
          </div>
        </div>
      )}

      <div className="row">
        <button type="button" className="icon-btn" aria-label="Reset" disabled={idle} onClick={() => upd({ startedAt: null, accumulatedMs: 0 })}>
          <IconReset />
        </button>
        <button type="button" className="btn primary big grow" onClick={toggle}>
          {running ? (
            <>
              <IconPause /> Pause
            </>
          ) : (
            <>
              <IconPlay /> {finished ? 'Restart' : elapsed > 0 ? 'Resume' : 'Start'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function BreakTimer({ elapsed }: { elapsed: number | null }) {
  const { data, updateTimers } = useAppStore();
  const br = data.timers.breakTimer;
  const target = data.settings.targetBreakSec;
  const over = target != null && elapsed != null && elapsed >= target * 1000;

  const start = () => updateTimers((t) => ({ ...t, breakTimer: { ...t.breakTimer, startedAt: Date.now() } }));
  const stop = () =>
    updateTimers((t) => {
      const s = t.breakTimer.startedAt;
      if (s == null) return t;
      const sec = Math.round((Date.now() - s) / 1000);
      return { ...t, breakTimer: { startedAt: null, recent: [sec, ...t.breakTimer.recent].slice(0, 10) } };
    });

  return (
    <div className="stack-lg fade-in">
      <div className="card stack" style={{ alignItems: 'center', padding: '32px 16px' }}>
        <div className={`timer-display${over ? ' over' : ''}`} role="timer">
          {formatClock(elapsed ?? 0)}
        </div>
        <p className="target-line small">
          {target == null ? 'Counts up · no target set' : over ? 'Target reached · go when ready' : `Gentle beep at ${formatClock(target * 1000)}`}
        </p>
      </div>
      <button type="button" className={`btn big block ${elapsed != null ? 'soft' : 'primary'}`} onClick={elapsed != null ? stop : start}>
        {elapsed != null ? (
          <>
            <IconPlay /> End break
          </>
        ) : (
          <>
            <IconCoffee /> Start break
          </>
        )}
      </button>
      {br.recent.length > 0 && (
        <div className="card flat stack">
          <div className="row-between">
            <h3>Recent breaks</h3>
            <button type="button" className="btn ghost small" onClick={() => updateTimers((t) => ({ ...t, breakTimer: { ...t.breakTimer, recent: [] } }))}>
              Clear
            </button>
          </div>
          <div className="chips">
            {br.recent.map((s, i) => (
              <span key={i} className="tag num">
                {formatClock(s * 1000)}
              </span>
            ))}
          </div>
          <p className="tiny muted">Average {formatDuration(br.recent.reduce((a, b) => a + b, 0) / br.recent.length)}</p>
        </div>
      )}
    </div>
  );
}
