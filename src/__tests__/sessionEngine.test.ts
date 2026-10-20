import { describe, expect, it } from 'vitest';
import {
  addExtraSet,
  canGoBack,
  completeSet,
  finishSession,
  goBack,
  holdToggle,
  nextSet,
  prefillFor,
  skipExercise,
  skipSet,
  startBreak,
  startSession,
  summarize,
} from '../store/sessionEngine';
import type { PlanItem } from '../types';

const items: PlanItem[] = [
  { uid: 'a', exerciseId: 'push-up', sets: 2, targetReps: 12 },
  { uid: 'b', exerciseId: 'plank', sets: 2, targetSec: 30 },
];
const T0 = 1_700_000_000_000;

describe('session engine', () => {
  it('walks through every set chronologically and records breaks', () => {
    let s = startSession(items, T0);
    expect(s.cursor).toEqual({ item: 0, set: 0 });

    s = completeSet(s, { reps: 12 }, { autoBreak: true }, T0 + 30_000);
    expect(s.phase).toBe('between');
    expect(s.breakStartedAt).toBe(T0 + 30_000);
    expect(s.cursor).toEqual({ item: 0, set: 1 });

    s = nextSet(s, T0 + 95_400);
    expect(s.phase).toBe('set');
    expect(s.breaks).toHaveLength(1);
    expect(s.breaks[0]).toMatchObject({ itemIndex: 0, setIndex: 0, exerciseId: 'push-up', durationSec: 65 });

    s = completeSet(s, { reps: 10 }, { autoBreak: true }, T0 + 120_000);
    s = nextSet(s, T0 + 180_000);
    expect(s.cursor).toEqual({ item: 1, set: 0 });

    s = completeSet(s, { durationSec: 30 }, { autoBreak: true }, T0 + 220_000);
    s = nextSet(s, T0 + 260_000);
    s = completeSet(s, { durationSec: 35 }, { autoBreak: true }, T0 + 300_000);
    expect(s.cursor).toBeNull();
    expect(s.breakStartedAt).toBeNull(); // no break after the final set

    const rec = finishSession(s, T0 + 310_000);
    const sum = summarize(rec);
    expect(sum).toMatchObject({ totalSec: 310, exercisesDone: 2, setsDone: 4, totalReps: 22, holdSec: 65, breakCount: 3 });
    expect(sum.avgBreakSec).toBeCloseTo((65 + 60 + 40) / 3);
  });

  it('only times breaks manually when auto break is off', () => {
    let s = startSession(items, T0);
    s = completeSet(s, { reps: 12 }, { autoBreak: false }, T0 + 10_000);
    expect(s.breakStartedAt).toBeNull();
    s = nextSet(s, T0 + 20_000);
    expect(s.breaks).toHaveLength(0);

    s = completeSet(s, { reps: 12 }, { autoBreak: false }, T0 + 30_000);
    s = startBreak(s, T0 + 35_000);
    s = nextSet(s, T0 + 80_000);
    expect(s.breaks[0].durationSec).toBe(45);
  });

  it('supports skip set, skip exercise, back and extra sets', () => {
    let s = startSession(items, T0);
    expect(canGoBack(s)).toBe(false);
    s = skipSet(s, T0 + 1);
    expect(s.cursor).toEqual({ item: 0, set: 1 });
    expect(s.sets[0].status).toBe('skipped');

    s = goBack(s);
    expect(s.cursor).toEqual({ item: 0, set: 0 });
    s = completeSet(s, { reps: 8 }, { autoBreak: true }, T0 + 2);
    expect(s.sets.filter((l) => l.itemIndex === 0 && l.setIndex === 0)).toHaveLength(1);
    expect(s.sets.find((l) => l.setIndex === 0)!.status).toBe('done');

    // extra set while between sets targets the exercise just finished
    s = addExtraSet(s);
    expect(s.items[0].sets).toBe(3);
    s = nextSet(s, T0 + 3);

    s = skipExercise(s, T0 + 4);
    expect(s.cursor).toEqual({ item: 1, set: 0 });
    expect(s.sets.filter((l) => l.itemIndex === 0)).toHaveLength(3);

    s = skipExercise(s, T0 + 5);
    expect(s.cursor).toBeNull();
    s = addExtraSet(s);
    expect(s.cursor).toEqual({ item: 1, set: 2 });
  });

  it('prefills from previous set, then target, then history', () => {
    let s = startSession([{ uid: 'x', exerciseId: 'db-curl', sets: 3, weightKg: 8 }], T0);
    const history = [finishSession({ ...startSession([{ uid: 'y', exerciseId: 'db-curl', sets: 1 }], T0 - 1e6), sets: [] }, T0 - 1e5)];
    history[0].sets.push({
      id: 'h', sessionId: history[0].id, itemIndex: 0, setIndex: 0, exerciseId: 'db-curl', exerciseName: 'Dumbbell curl',
      bodyPart: 'biceps', kind: 'reps', status: 'done', reps: 11, weightKg: 7, completedAt: T0 - 1e5,
    });
    expect(prefillFor(s, { item: 0, set: 0 }, history)).toMatchObject({ reps: 11, weightKg: 8 });
    s = completeSet(s, { reps: 9, weightKg: 10 }, { autoBreak: true }, T0 + 1);
    expect(prefillFor(s, { item: 0, set: 1 }, history)).toMatchObject({ reps: 9, weightKg: 10 });
  });

  it('hold timer is timestamp based', () => {
    let s = startSession(items, T0);
    s = holdToggle(s, T0 + 1000);
    expect(s.hold.startedAt).toBe(T0 + 1000);
    s = holdToggle(s, T0 + 21_000); // pause after 20s regardless of tick count
    expect(s.hold).toMatchObject({ startedAt: null, accumulatedMs: 20_000 });
    s = holdToggle(s, T0 + 100_000);
    s = holdToggle(s, T0 + 105_000);
    expect(s.hold.accumulatedMs).toBe(25_000);
  });
});
