/**
 * Pure state transitions for a guided session. Every function takes the
 * current ActiveSession and returns a new one, so the logic is easy to test
 * and the state can be persisted at any moment (and resumed after a reload).
 */
import { EXERCISE_BY_ID } from '../data/exercises';
import type { ActiveSession, BreakLog, PlanItem, Position, SessionRecord, SetLog } from '../types';
import { uid } from '../lib/id';
import { elapsedMs } from '../lib/useNow';

const freshHold = (): ActiveSession['hold'] => ({ mode: 'up', startedAt: null, accumulatedMs: 0 });

export function firstPosition(items: PlanItem[]): Position | null {
  const i = items.findIndex((it) => it.sets > 0);
  return i === -1 ? null : { item: i, set: 0 };
}

export function lastPosition(items: PlanItem[]): Position | null {
  for (let i = items.length - 1; i >= 0; i--) if (items[i].sets > 0) return { item: i, set: items[i].sets - 1 };
  return null;
}

export function nextPosition(items: PlanItem[], pos: Position): Position | null {
  if (pos.set + 1 < items[pos.item].sets) return { item: pos.item, set: pos.set + 1 };
  for (let i = pos.item + 1; i < items.length; i++) if (items[i].sets > 0) return { item: i, set: 0 };
  return null;
}

export function prevPosition(items: PlanItem[], pos: Position): Position | null {
  if (pos.set > 0) return { item: pos.item, set: pos.set - 1 };
  for (let i = pos.item - 1; i >= 0; i--) if (items[i].sets > 0) return { item: i, set: items[i].sets - 1 };
  return null;
}

export function startSession(items: PlanItem[], now = Date.now()): ActiveSession {
  const copy = items.map((it) => ({ ...it }));
  return {
    id: uid(),
    startedAt: now,
    items: copy,
    cursor: firstPosition(copy),
    phase: 'set',
    breakStartedAt: null,
    lastDone: null,
    sets: [],
    breaks: [],
    hold: freshHold(),
  };
}

function upsertLog(sets: SetLog[], log: SetLog): SetLog[] {
  return [...sets.filter((s) => !(s.itemIndex === log.itemIndex && s.setIndex === log.setIndex)), log];
}

function makeLog(s: ActiveSession, pos: Position, status: SetLog['status'], now: number, values: Partial<SetLog> = {}): SetLog {
  const item = s.items[pos.item];
  const ex = EXERCISE_BY_ID[item.exerciseId];
  return {
    id: uid(),
    sessionId: s.id,
    itemIndex: pos.item,
    setIndex: pos.set,
    exerciseId: item.exerciseId,
    exerciseName: ex?.name ?? item.exerciseId,
    bodyPart: ex?.bodyPart ?? 'abs',
    kind: ex?.kind ?? 'reps',
    status,
    completedAt: now,
    ...values,
  };
}

export interface SetInput {
  reps?: number;
  weightKg?: number;
  durationSec?: number;
}

export function completeSet(s: ActiveSession, input: SetInput, opts: { autoBreak: boolean }, now = Date.now()): ActiveSession {
  if (!s.cursor) return s;
  const clean: SetInput = {};
  if (input.reps != null && !Number.isNaN(input.reps)) clean.reps = input.reps;
  if (input.weightKg != null && !Number.isNaN(input.weightKg)) clean.weightKg = input.weightKg;
  if (input.durationSec != null && !Number.isNaN(input.durationSec)) clean.durationSec = input.durationSec;
  const log = makeLog(s, s.cursor, 'done', now, clean);
  const next = nextPosition(s.items, s.cursor);
  return {
    ...s,
    sets: upsertLog(s.sets, log),
    lastDone: s.cursor,
    cursor: next,
    phase: 'between',
    breakStartedAt: opts.autoBreak && next ? now : null,
    hold: freshHold(),
  };
}

export function startBreak(s: ActiveSession, now = Date.now()): ActiveSession {
  if (s.phase !== 'between' || s.breakStartedAt != null) return s;
  return { ...s, breakStartedAt: now };
}

/** Ends the break (recording its exact duration) and moves on to the set at the cursor. */
export function nextSet(s: ActiveSession, now = Date.now()): ActiveSession {
  if (s.phase !== 'between') return s;
  let breaks = s.breaks;
  if (s.breakStartedAt != null && s.lastDone) {
    const item = s.items[s.lastDone.item];
    const log: BreakLog = {
      id: uid(),
      sessionId: s.id,
      exerciseId: item.exerciseId,
      exerciseName: EXERCISE_BY_ID[item.exerciseId]?.name ?? item.exerciseId,
      itemIndex: s.lastDone.item,
      setIndex: s.lastDone.set,
      startedAt: s.breakStartedAt,
      endedAt: now,
      durationSec: Math.max(0, Math.round((now - s.breakStartedAt) / 1000)),
    };
    breaks = [...breaks, log];
  }
  return { ...s, breaks, phase: 'set', breakStartedAt: null, hold: freshHold() };
}

export function skipSet(s: ActiveSession, now = Date.now()): ActiveSession {
  if (!s.cursor) return s;
  const already = s.sets.some((l) => l.itemIndex === s.cursor!.item && l.setIndex === s.cursor!.set);
  const sets = already ? s.sets : upsertLog(s.sets, makeLog(s, s.cursor, 'skipped', now));
  const cursor = nextPosition(s.items, s.cursor);
  return { ...s, sets, cursor, breakStartedAt: cursor ? s.breakStartedAt : null, hold: freshHold() };
}

export function skipExercise(s: ActiveSession, now = Date.now()): ActiveSession {
  if (!s.cursor) return s;
  const { item } = s.cursor;
  let sets = s.sets;
  for (let set = s.cursor.set; set < s.items[item].sets; set++) {
    if (!sets.some((l) => l.itemIndex === item && l.setIndex === set)) {
      sets = upsertLog(sets, makeLog(s, { item, set }, 'skipped', now));
    }
  }
  const after = nextPosition(s.items, { item, set: s.items[item].sets - 1 });
  return { ...s, sets, cursor: after, breakStartedAt: after ? s.breakStartedAt : null, hold: freshHold() };
}

/** Return to the previous set (e.g. to redo or correct it). Any running break is discarded. */
export function goBack(s: ActiveSession): ActiveSession {
  const target = s.cursor ? prevPosition(s.items, s.cursor) : lastPosition(s.items);
  if (!target) return s;
  return { ...s, cursor: target, phase: 'set', breakStartedAt: null, hold: freshHold() };
}

export function canGoBack(s: ActiveSession): boolean {
  return (s.cursor ? prevPosition(s.items, s.cursor) : lastPosition(s.items)) != null;
}

/**
 * Adds one more set to the current exercise. Between sets (or at the end)
 * it targets the exercise just finished and makes the new set the next one.
 */
export function addExtraSet(s: ActiveSession): ActiveSession {
  const target = !s.cursor
    ? lastPosition(s.items)?.item
    : s.phase === 'set'
      ? s.cursor.item
      : (s.lastDone?.item ?? s.cursor.item);
  if (target == null) return s;
  const items = s.items.map((it, i) => (i === target ? { ...it, sets: it.sets + 1 } : it));
  let cursor = s.cursor;
  if (!cursor || (s.phase === 'between' && cursor.item !== target)) {
    cursor = { item: target, set: items[target].sets - 1 };
  }
  return { ...s, items, cursor };
}

export function holdToggle(s: ActiveSession, now = Date.now()): ActiveSession {
  const h = s.hold;
  if (h.startedAt != null) return { ...s, hold: { ...h, startedAt: null, accumulatedMs: elapsedMs(h.startedAt, h.accumulatedMs, now) } };
  return { ...s, hold: { ...h, startedAt: now } };
}

export function holdReset(s: ActiveSession): ActiveSession {
  return { ...s, hold: { ...freshHold(), mode: s.hold.mode } };
}

export function holdSetMode(s: ActiveSession, mode: 'up' | 'down'): ActiveSession {
  return { ...s, hold: { ...s.hold, mode } };
}

export function finishSession(s: ActiveSession, now = Date.now()): SessionRecord {
  return {
    id: s.id,
    startedAt: s.startedAt,
    endedAt: now,
    durationSec: Math.max(0, Math.round((now - s.startedAt) / 1000)),
    items: s.items,
    sets: [...s.sets].sort((a, b) => a.itemIndex - b.itemIndex || a.setIndex - b.setIndex),
    breaks: s.breaks,
  };
}

export interface SessionSummary {
  totalSec: number;
  exercisesDone: number;
  setsDone: number;
  setsSkipped: number;
  totalReps: number;
  volumeKg: number;
  holdSec: number;
  breakCount: number;
  totalBreakSec: number;
  avgBreakSec: number | null;
}

export function summarize(r: SessionRecord): SessionSummary {
  const done = r.sets.filter((x) => x.status === 'done');
  const totalBreakSec = r.breaks.reduce((a, b) => a + b.durationSec, 0);
  return {
    totalSec: r.durationSec,
    exercisesDone: new Set(done.map((d) => d.itemIndex)).size,
    setsDone: done.length,
    setsSkipped: r.sets.length - done.length,
    totalReps: done.reduce((a, d) => a + (d.reps ?? 0), 0),
    volumeKg: done.reduce((a, d) => a + (d.reps ?? 0) * (d.weightKg ?? 0), 0),
    holdSec: done.reduce((a, d) => a + (d.durationSec ?? 0), 0),
    breakCount: r.breaks.length,
    totalBreakSec,
    avgBreakSec: r.breaks.length ? totalBreakSec / r.breaks.length : null,
  };
}

/**
 * Values to pre-fill for a set: this set's existing log (when going back),
 * then the previous set of this exercise in this session, then the plan's
 * target, then the most recent value from history.
 */
export function prefillFor(s: ActiveSession, pos: Position, history: SessionRecord[]): SetInput {
  const item = s.items[pos.item];
  const own = s.sets.find((l) => l.itemIndex === pos.item && l.setIndex === pos.set && l.status === 'done');
  const prev = [...s.sets]
    .filter((l) => l.itemIndex === pos.item && l.setIndex < pos.set && l.status === 'done')
    .sort((a, b) => b.setIndex - a.setIndex)[0];
  const last = lastHistorySet(history, item.exerciseId);
  const pick = <K extends keyof SetInput>(k: K, target: SetInput[K]): SetInput[K] => own?.[k] ?? prev?.[k] ?? target ?? last?.[k];
  return {
    reps: pick('reps', item.targetReps),
    weightKg: pick('weightKg', item.weightKg),
    durationSec: pick('durationSec', item.targetSec),
  };
}

export function lastHistorySet(history: SessionRecord[], exerciseId: string): SetLog | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const sets = history[i].sets.filter((l) => l.exerciseId === exerciseId && l.status === 'done');
    if (sets.length) return sets[sets.length - 1];
  }
  return undefined;
}

export function totalPlannedSets(s: ActiveSession): number {
  return s.items.reduce((a, it) => a + it.sets, 0);
}

export function resolvedCount(s: ActiveSession): number {
  return s.sets.length;
}
