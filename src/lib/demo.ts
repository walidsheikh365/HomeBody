import { EXERCISE_BY_ID } from '../data/exercises';
import type { BreakLog, PlanItem, SessionRecord, SetLog } from '../types';
import type { KV } from './storage';

/**
 * Dev-only sample history so the Analytics page can be previewed without real workouts.
 * Enabled with `?demo` in development; lives in memory and never touches saved data.
 */

const ROUTINES: { id: string; reps?: number; sec?: number; kg?: number }[][] = [
  [{ id: 'push-up', reps: 15 }, { id: 'db-overhead-press', reps: 10, kg: 12 }, { id: 'db-lateral-raise', reps: 12, kg: 6 }, { id: 'diamond-push-up', reps: 10 }, { id: 'plank', sec: 45 }],
  [{ id: 'db-goblet-squat', reps: 12, kg: 16 }, { id: 'db-romanian-deadlift', reps: 10, kg: 18 }, { id: 'reverse-lunge', reps: 12 }, { id: 'glute-bridge', reps: 15 }, { id: 'wall-sit', sec: 50 }],
  [{ id: 'db-bent-over-row', reps: 10, kg: 16 }, { id: 'band-pull-apart', reps: 15 }, { id: 'db-curl', reps: 10, kg: 10 }, { id: 'db-hammer-curl', reps: 10, kg: 10 }, { id: 'superman', reps: 12 }],
  [{ id: 'crunch', reps: 20 }, { id: 'russian-twist', reps: 24 }, { id: 'ab-wheel-rollout', reps: 8 }, { id: 'side-plank', sec: 30 }, { id: 'mountain-climbers', reps: 30 }],
];

/** Small seeded PRNG so the demo looks the same on every reload. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function demoSessions(now = Date.now(), days = 84): SessionRecord[] {
  const rand = rng(42);
  const out: SessionRecord[] = [];
  let n = 0;
  for (let d = days; d >= 0; d--) {
    // ~4 workouts a week, a little more consistent recently
    if (rand() > (d < 21 ? 0.68 : 0.5)) continue;
    const day = new Date(now - d * 864e5);
    day.setHours(7 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0, 0);
    if (day.getTime() > now) continue;
    const id = `demo-${n}`;
    const routine = ROUTINES[n % ROUTINES.length];
    const progress = 1 + (days - d) / days / 4; // gentle progressive overload
    const items: PlanItem[] = routine.map((r) => ({
      uid: `${id}-${r.id}`,
      exerciseId: r.id,
      sets: 3,
      targetReps: r.reps,
      targetSec: r.sec,
      weightKg: r.kg && Math.round(r.kg * progress),
    }));
    const sets: SetLog[] = [];
    const breaks: BreakLog[] = [];
    let t = day.getTime();
    items.forEach((item, itemIndex) => {
      const ex = EXERCISE_BY_ID[item.exerciseId];
      for (let setIndex = 0; setIndex < item.sets; setIndex++) {
        const skipped = rand() < 0.04;
        const work = item.targetSec ?? 35 + Math.round(rand() * 20);
        t += work * 1000;
        sets.push({
          id: `${id}-s${sets.length}`,
          sessionId: id,
          itemIndex,
          setIndex,
          exerciseId: ex.id,
          exerciseName: ex.name,
          bodyPart: ex.bodyPart,
          kind: ex.kind,
          status: skipped ? 'skipped' : 'done',
          ...(skipped
            ? {}
            : item.targetReps
              ? { reps: Math.max(1, item.targetReps - Math.floor(rand() * 3)), weightKg: item.weightKg }
              : { durationSec: Math.round(work * (0.85 + rand() * 0.3)) }),
          completedAt: t,
        });
        const rest = Math.round(45 + rand() * 60 - (days - d) / 4);
        breaks.push({ id: `${id}-b${breaks.length}`, sessionId: id, exerciseId: ex.id, exerciseName: ex.name, itemIndex, setIndex, startedAt: t, endedAt: t + rest * 1000, durationSec: rest });
        t += rest * 1000;
      }
    });
    breaks.pop();
    const endedAt = sets[sets.length - 1].completedAt;
    out.push({ id, startedAt: day.getTime(), endedAt, durationSec: Math.round((endedAt - day.getTime()) / 1000), items, sets, breaks });
    n++;
  }
  return out;
}

/** In-memory KV pre-filled with demo sessions (settings, draft etc. stay default). */
export function demoKV(): KV {
  const map = new Map<string, string>([['homebody:v1:sessions', JSON.stringify(demoSessions())]]);
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}
