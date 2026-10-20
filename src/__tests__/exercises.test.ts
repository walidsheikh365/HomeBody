import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../data/exercises';
import { BODY_PARTS, EQUIPMENT } from '../data/meta';
import { isAvailable } from '../lib/filter';
import { DEFAULT_SETTINGS } from '../lib/storage';

describe('exercise library', () => {
  it('has 120+ exercises with unique ids', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(120);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });

  it('every entry is complete and valid', () => {
    const parts = new Set(BODY_PARTS.map((b) => b.id));
    const equip = new Set(EQUIPMENT.map((e) => e.id));
    for (const e of EXERCISES) {
      expect(parts.has(e.bodyPart), e.id).toBe(true);
      expect(e.equipment.length, e.id).toBeGreaterThan(0);
      for (const q of e.equipment) expect(equip.has(q), `${e.id}:${q}`).toBe(true);
      expect(['reps', 'timed']).toContain(e.kind);
      expect(e.cue.length, e.id).toBeGreaterThan(20);
      expect(e.name.trim(), e.id).toBe(e.name);
    }
  });

  it('covers every body part and every equipment type', () => {
    for (const b of BODY_PARTS) expect(EXERCISES.some((e) => e.bodyPart === b.id), b.id).toBe(true);
    for (const q of EQUIPMENT) expect(EXERCISES.some((e) => e.equipment.includes(q.id)), q.id).toBe(true);
  });

  it('shows an exercise only when ALL of its equipment is on', () => {
    const eq = { ...DEFAULT_SETTINGS.equipment };
    const chestBall = EXERCISES.find((e) => e.id === 'gymball-db-chest-press')!;
    expect(isAvailable(chestBall, eq)).toBe(true);
    expect(isAvailable(chestBall, { ...eq, gymball: false })).toBe(false);
    const bwOnly = Object.fromEntries(EQUIPMENT.map((q) => [q.id, q.id === 'bodyweight'])) as typeof eq;
    const visible = EXERCISES.filter((e) => isAvailable(e, bwOnly));
    expect(visible.length).toBeGreaterThan(40);
    expect(visible.every((e) => e.equipment.every((q) => q === 'bodyweight'))).toBe(true);
  });
});

describe('pose illustrations', () => {
  it('every exercise has an explicit pose that renders inside the icon box', async () => {
    const { hasExplicitPose, figureFor } = await import('../figures/map');
    for (const e of EXERCISES) {
      expect(hasExplicitPose(e.id), e.id).toBe(true);
      const fig = figureFor(e);
      expect(fig.shapes.length, e.id).toBeGreaterThan(8);
      for (const s of fig.shapes) {
        const pts = s.t === 'line' ? [s.a, s.b] : [s.c];
        for (const [x, y] of pts) {
          expect(Number.isFinite(x) && Number.isFinite(y), e.id).toBe(true);
          expect(x, e.id).toBeGreaterThanOrEqual(0);
          expect(x, e.id).toBeLessThanOrEqual(64);
          expect(y, e.id).toBeGreaterThanOrEqual(0);
          expect(y, e.id).toBeLessThanOrEqual(64);
        }
      }
    }
  });
});
