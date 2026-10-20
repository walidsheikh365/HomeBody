import { describe, expect, it } from 'vitest';
import { LocalStore, MemoryKV, validateBundle } from '../lib/storage';
import { finishSession, startSession, completeSet } from '../store/sessionEngine';

function makeSession(t: number) {
  let s = startSession([{ uid: 'u', exerciseId: 'push-up', sets: 1 }], t);
  s = completeSet(s, { reps: 10 }, { autoBreak: true }, t + 1000);
  return finishSession(s, t + 2000);
}

describe('storage', () => {
  it('round-trips settings, draft and sessions', async () => {
    const store = new LocalStore(new MemoryKV());
    const d = await store.loadAll();
    expect(d.settings.defaultSets).toBe(3);
    await store.saveSettings({ ...d.settings, unit: 'lb', theme: 'aurora' });
    await store.saveDraft({ items: [{ uid: '1', exerciseId: 'plank', sets: 3 }], updatedAt: 1 });
    await store.putSession(makeSession(2000));
    await store.putSession(makeSession(1000));
    const again = await store.loadAll();
    expect(again.settings).toMatchObject({ unit: 'lb', theme: 'aurora' });
    expect(again.draft.items).toHaveLength(1);
    expect(again.sessions.map((s) => s.startedAt)).toEqual([1000, 2000]);
  });

  it('exports and imports (merge dedupes, replace overwrites)', async () => {
    const a = new LocalStore(new MemoryKV());
    const s1 = makeSession(1000);
    await a.putSession(s1);
    const bundle = JSON.parse(JSON.stringify(await a.exportAll()));

    const b = new LocalStore(new MemoryKV());
    await b.putSession(makeSession(5000));
    let merged = await b.importAll(bundle, 'merge');
    expect(merged.sessions).toHaveLength(2);
    merged = await b.importAll(bundle, 'merge');
    expect(merged.sessions).toHaveLength(2);

    const replaced = await b.importAll(bundle, 'replace');
    expect(replaced.sessions.map((s) => s.id)).toEqual([s1.id]);
  });

  it('rejects foreign or malformed files', () => {
    expect(() => validateBundle({ foo: 1 })).toThrow(/not a HomeBody/);
    expect(() => validateBundle({ app: 'homebody', version: 2, data: {} })).toThrow(/version/);
    expect(() => validateBundle({ app: 'homebody', version: 1, data: { sessions: [{ id: 3 }] } })).toThrow(/malformed/);
  });

  it('fills in missing fields from older/partial data', async () => {
    const kv = new MemoryKV();
    kv.setItem('homebody:v1:settings', JSON.stringify({ theme: 'luna', equipment: { wall: false } }));
    const d = await new LocalStore(kv).loadAll();
    expect(d.settings.theme).toBe('luna');
    expect(d.settings.equipment.wall).toBe(false);
    expect(d.settings.equipment.dumbbells).toBe(true);
    expect(d.settings.autoBreak).toBe(true);
  });
});
