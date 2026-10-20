/**
 * Data-access layer. The UI only talks to the `DataStore` interface, so a
 * backend (Vercel KV, Supabase, …) can be added later by writing another
 * implementation and swapping it in `getDataStore()`.
 */
import type { ActiveSession, AppData, Draft, ExportBundle, SessionRecord, Settings, TimerState } from '../types';

export interface DataStore {
  loadAll(): Promise<AppData>;
  saveSettings(settings: Settings): Promise<void>;
  saveDraft(draft: Draft): Promise<void>;
  saveActive(active: ActiveSession | null): Promise<void>;
  saveTimers(timers: TimerState): Promise<void>;
  /** Insert or replace a completed session. */
  putSession(session: SessionRecord): Promise<void>;
  deleteSession(id: string): Promise<void>;
  exportAll(): Promise<ExportBundle>;
  importAll(bundle: ExportBundle, mode: 'merge' | 'replace'): Promise<AppData>;
  resetAll(): Promise<AppData>;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'soleil',
  equipment: {
    bodyweight: true,
    wall: true,
    dumbbells: true,
    bands: true,
    abwheel: true,
    medball: true,
    gymball: true,
  },
  defaultSets: 3,
  autoBreak: true,
  targetBreakSec: 90,
  sound: true,
  unit: 'kg',
  browseMode: 'bodyPart',
};

export const DEFAULT_TIMERS: TimerState = {
  tab: 'stopwatch',
  stopwatch: { startedAt: null, accumulatedMs: 0, laps: [] },
  countdown: { durationSec: 60, startedAt: null, accumulatedMs: 0 },
  breakTimer: { startedAt: null, recent: [] },
};

export function defaultData(): AppData {
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return {
    settings: { ...DEFAULT_SETTINGS, theme: prefersDark ? 'luna' : 'soleil', equipment: { ...DEFAULT_SETTINGS.equipment } },
    draft: { items: [], updatedAt: Date.now() },
    active: null,
    sessions: [],
    timers: structuredClone(DEFAULT_TIMERS),
  };
}

/** Fill gaps so data from older versions / partial imports is always complete. */
export function normalizeData(input: Partial<AppData> | null | undefined, base: AppData = defaultData()): AppData {
  const d = input ?? {};
  const settings = { ...base.settings, ...(d.settings ?? {}) };
  settings.equipment = { ...base.settings.equipment, ...(d.settings?.equipment ?? {}) };
  const timers: TimerState = {
    ...base.timers,
    ...(d.timers ?? {}),
    stopwatch: { ...base.timers.stopwatch, ...(d.timers?.stopwatch ?? {}) },
    countdown: { ...base.timers.countdown, ...(d.timers?.countdown ?? {}) },
    breakTimer: { ...base.timers.breakTimer, ...(d.timers?.breakTimer ?? {}) },
  };
  return {
    settings,
    draft: d.draft && Array.isArray(d.draft.items) ? d.draft : base.draft,
    active: d.active ?? null,
    sessions: Array.isArray(d.sessions) ? [...d.sessions].sort((a, b) => a.startedAt - b.startedAt) : [],
    timers,
  };
}

export function validateBundle(raw: unknown): ExportBundle {
  if (!raw || typeof raw !== 'object') throw new Error('File is not valid JSON data.');
  const b = raw as Partial<ExportBundle>;
  if (b.app !== 'homebody') throw new Error('This file is not a HomeBody export.');
  if (b.version !== 1) throw new Error(`Unsupported export version: ${String(b.version)}`);
  if (!b.data || typeof b.data !== 'object') throw new Error('Export is missing its data.');
  const sessions = (b.data as AppData).sessions;
  if (sessions != null && !Array.isArray(sessions)) throw new Error('Export sessions are malformed.');
  for (const s of sessions ?? []) {
    if (!s || typeof s.id !== 'string' || typeof s.startedAt !== 'number' || !Array.isArray(s.sets)) {
      throw new Error('Export contains a malformed session.');
    }
  }
  return b as ExportBundle;
}

/** Merge keeps current settings/draft and adds sessions not already present (by id). */
export function mergeData(current: AppData, incoming: AppData): AppData {
  const byId = new Map(current.sessions.map((s) => [s.id, s]));
  for (const s of incoming.sessions) if (!byId.has(s.id)) byId.set(s.id, s);
  return { ...current, sessions: [...byId.values()].sort((a, b) => a.startedAt - b.startedAt) };
}

/** Minimal synchronous key-value interface (localStorage-compatible) for easy testing. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PREFIX = 'homebody:v1:';
const KEYS = {
  settings: `${PREFIX}settings`,
  draft: `${PREFIX}draft`,
  active: `${PREFIX}active`,
  sessions: `${PREFIX}sessions`,
  timers: `${PREFIX}timers`,
} as const;

export class LocalStore implements DataStore {
  constructor(private kv: KV) {}

  private read<T>(key: string): T | undefined {
    try {
      const raw = this.kv.getItem(key);
      return raw == null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  }

  private write(key: string, value: unknown) {
    try {
      if (value == null) this.kv.removeItem(key);
      else this.kv.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('HomeBody: failed to save', key, err);
      throw err;
    }
  }

  async loadAll(): Promise<AppData> {
    return normalizeData({
      settings: this.read<Settings>(KEYS.settings),
      draft: this.read<Draft>(KEYS.draft),
      active: this.read<ActiveSession>(KEYS.active) ?? null,
      sessions: this.read<SessionRecord[]>(KEYS.sessions),
      timers: this.read<TimerState>(KEYS.timers),
    });
  }

  async saveSettings(settings: Settings) {
    this.write(KEYS.settings, settings);
  }
  async saveDraft(draft: Draft) {
    this.write(KEYS.draft, draft);
  }
  async saveActive(active: ActiveSession | null) {
    this.write(KEYS.active, active);
  }
  async saveTimers(timers: TimerState) {
    this.write(KEYS.timers, timers);
  }

  async putSession(session: SessionRecord) {
    const list = (this.read<SessionRecord[]>(KEYS.sessions) ?? []).filter((s) => s.id !== session.id);
    list.push(session);
    list.sort((a, b) => a.startedAt - b.startedAt);
    this.write(KEYS.sessions, list);
  }

  async deleteSession(id: string) {
    const list = (this.read<SessionRecord[]>(KEYS.sessions) ?? []).filter((s) => s.id !== id);
    this.write(KEYS.sessions, list);
  }

  async exportAll(): Promise<ExportBundle> {
    return { app: 'homebody', version: 1, exportedAt: new Date().toISOString(), data: await this.loadAll() };
  }

  private async writeAll(data: AppData) {
    this.write(KEYS.settings, data.settings);
    this.write(KEYS.draft, data.draft);
    this.write(KEYS.active, data.active);
    this.write(KEYS.sessions, data.sessions);
    this.write(KEYS.timers, data.timers);
  }

  async importAll(bundle: ExportBundle, mode: 'merge' | 'replace'): Promise<AppData> {
    const incoming = normalizeData(validateBundle(bundle).data);
    const next = mode === 'replace' ? incoming : mergeData(await this.loadAll(), incoming);
    await this.writeAll(next);
    return next;
  }

  async resetAll(): Promise<AppData> {
    for (const k of Object.values(KEYS)) this.kv.removeItem(k);
    return this.loadAll();
  }
}

export class MemoryKV implements KV {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

let instance: DataStore | null = null;

export function getDataStore(): DataStore {
  if (!instance) {
    let kv: KV;
    try {
      kv = window.localStorage;
      kv.setItem(`${PREFIX}probe`, '1');
      kv.removeItem(`${PREFIX}probe`);
    } catch {
      kv = new MemoryKV();
    }
    instance = new LocalStore(kv);
  }
  return instance;
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}
