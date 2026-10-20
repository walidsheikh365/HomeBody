import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActiveSession, AppData, Equipment, ExportBundle, PlanItem, SessionRecord, Settings, TimerState } from '../types';
import { defaultData, getDataStore, requestPersistentStorage } from '../lib/storage';
import { applyTheme } from '../lib/theme';
import { setSoundEnabled } from '../lib/audio';
import { uid } from '../lib/id';
import { finishSession, startSession } from './sessionEngine';

interface Store {
  data: AppData;
  ready: boolean;
  saveError: string | null;
  updateSettings: (patch: Partial<Settings>) => void;
  toggleEquipment: (e: Equipment) => void;
  /** Library add/remove. Targets the running session if there is one, else the draft. */
  isPlanned: (exerciseId: string) => boolean;
  canRemovePlanned: (exerciseId: string) => boolean;
  togglePlanned: (exerciseId: string) => void;
  updateDraftItem: (uid: string, patch: Partial<PlanItem>) => void;
  moveDraftItem: (uid: string, dir: -1 | 1) => void;
  removeDraftItem: (uid: string) => void;
  clearDraft: () => void;
  replaceDraft: (items: Omit<PlanItem, 'uid'>[]) => void;
  startFromDraft: () => void;
  updateActive: (fn: (a: ActiveSession) => ActiveSession) => void;
  /** Saves the session (if any set was done) and returns it. */
  finishActive: () => SessionRecord | null;
  discardActive: () => void;
  deleteSession: (id: string) => void;
  updateTimers: (fn: (t: TimerState) => TimerState) => void;
  exportAll: () => Promise<ExportBundle>;
  importAll: (bundle: ExportBundle, mode: 'merge' | 'replace') => Promise<void>;
  resetAll: () => Promise<void>;
}

/** In a running session, only untouched items after the current position can be removed. */
function removableActiveIndex(a: ActiveSession, exerciseId: string): number {
  for (let idx = a.items.length - 1; idx >= 0; idx--) {
    if (a.items[idx].exerciseId !== exerciseId) continue;
    const touched =
      a.sets.some((l) => l.itemIndex >= idx) ||
      (a.cursor != null && a.cursor.item >= idx) ||
      (a.lastDone != null && a.lastDone.item >= idx);
    return touched ? -1 : idx;
  }
  return -1;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getDataStore(), []);
  const [data, setData] = useState<AppData>(defaultData);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let alive = true;
    store.loadAll().then((d) => {
      if (!alive) return;
      setData(d);
      setReady(true);
    });
    requestPersistentStorage();
    return () => {
      alive = false;
    };
  }, [store]);

  const guard = useCallback((p: Promise<void>) => {
    p.then(() => setSaveError(null)).catch((e: unknown) => setSaveError(e instanceof Error ? e.message : 'Could not save data'));
  }, []);

  useEffect(() => {
    if (ready) guard(store.saveSettings(data.settings));
  }, [ready, store, guard, data.settings]);
  useEffect(() => {
    if (ready) guard(store.saveDraft(data.draft));
  }, [ready, store, guard, data.draft]);
  useEffect(() => {
    if (ready) guard(store.saveActive(data.active));
  }, [ready, store, guard, data.active]);
  useEffect(() => {
    if (ready) guard(store.saveTimers(data.timers));
  }, [ready, store, guard, data.timers]);

  useEffect(() => {
    applyTheme(data.settings.theme);
  }, [data.settings.theme]);
  useEffect(() => {
    setSoundEnabled(data.settings.sound);
  }, [data.settings.sound]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const toggleEquipment = useCallback((e: Equipment) => {
    setData((d) => ({ ...d, settings: { ...d.settings, equipment: { ...d.settings.equipment, [e]: !d.settings.equipment[e] } } }));
  }, []);

  const setDraftItems = (fn: (items: PlanItem[]) => PlanItem[]) =>
    setData((d) => ({ ...d, draft: { items: fn(d.draft.items), updatedAt: Date.now() } }));

  const isPlanned = useCallback(
    (exerciseId: string) => (data.active ? data.active.items : data.draft.items).some((i) => i.exerciseId === exerciseId),
    [data.active, data.draft.items],
  );

  const canRemovePlanned = useCallback(
    (exerciseId: string) => (data.active ? removableActiveIndex(data.active, exerciseId) !== -1 : true),
    [data.active],
  );

  const togglePlanned = useCallback((exerciseId: string) => {
    setData((d) => {
      if (d.active) {
        const a = d.active;
        const present = a.items.some((i) => i.exerciseId === exerciseId);
        if (present) {
          const idx = removableActiveIndex(a, exerciseId);
          if (idx === -1) return d;
          return { ...d, active: { ...a, items: a.items.filter((_, i) => i !== idx) } };
        }
        const items = [...a.items, { uid: uid(), exerciseId, sets: d.settings.defaultSets }];
        // If every set was already finished, point the cursor at the new exercise.
        const cursor = a.cursor ?? { item: items.length - 1, set: 0 };
        return { ...d, active: { ...a, items, cursor } };
      }
      const present = d.draft.items.some((i) => i.exerciseId === exerciseId);
      const items = present
        ? d.draft.items.filter((i) => i.exerciseId !== exerciseId)
        : [...d.draft.items, { uid: uid(), exerciseId, sets: d.settings.defaultSets }];
      return { ...d, draft: { items, updatedAt: Date.now() } };
    });
  }, []);

  const updateDraftItem = useCallback((id: string, patch: Partial<PlanItem>) => {
    setDraftItems((items) => items.map((i) => (i.uid === id ? { ...i, ...patch } : i)));
  }, []);

  const moveDraftItem = useCallback((id: string, dir: -1 | 1) => {
    setDraftItems((items) => {
      const i = items.findIndex((x) => x.uid === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= items.length) return items;
      const copy = [...items];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }, []);

  const removeDraftItem = useCallback((id: string) => setDraftItems((items) => items.filter((i) => i.uid !== id)), []);
  const clearDraft = useCallback(() => setDraftItems(() => []), []);
  const replaceDraft = useCallback((items: Omit<PlanItem, 'uid'>[]) => setDraftItems(() => items.map((i) => ({ ...i, uid: uid() }))), []);

  const startFromDraft = useCallback(() => {
    setData((d) => (d.draft.items.length && !d.active ? { ...d, active: startSession(d.draft.items) } : d));
  }, []);

  const updateActive = useCallback((fn: (a: ActiveSession) => ActiveSession) => {
    setData((d) => (d.active ? { ...d, active: fn(d.active) } : d));
  }, []);

  const finishActive = useCallback((): SessionRecord | null => {
    const a = dataRef.current.active;
    if (!a) return null;
    const record = finishSession(a);
    const hasWork = record.sets.some((s) => s.status === 'done');
    if (hasWork) guard(store.putSession(record));
    setData((d) => ({
      ...d,
      active: null,
      sessions: hasWork ? [...d.sessions.filter((s) => s.id !== record.id), record] : d.sessions,
    }));
    return hasWork ? record : null;
  }, [store, guard]);

  const discardActive = useCallback(() => setData((d) => ({ ...d, active: null })), []);

  const deleteSession = useCallback(
    (id: string) => {
      guard(store.deleteSession(id));
      setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
    },
    [store, guard],
  );

  const updateTimers = useCallback((fn: (t: TimerState) => TimerState) => setData((d) => ({ ...d, timers: fn(d.timers) })), []);

  const exportAll = useCallback(() => store.exportAll(), [store]);
  const importAll = useCallback(
    async (bundle: ExportBundle, mode: 'merge' | 'replace') => {
      setData(await store.importAll(bundle, mode));
    },
    [store],
  );
  const resetAll = useCallback(async () => {
    setData(await store.resetAll());
  }, [store]);

  const value: Store = {
    data,
    ready,
    saveError,
    updateSettings,
    toggleEquipment,
    isPlanned,
    canRemovePlanned,
    togglePlanned,
    updateDraftItem,
    moveDraftItem,
    removeDraftItem,
    clearDraft,
    replaceDraft,
    startFromDraft,
    updateActive,
    finishActive,
    discardActive,
    deleteSession,
    updateTimers,
    exportAll,
    importAll,
    resetAll,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useAppStore must be used inside AppStoreProvider');
  return s;
}
