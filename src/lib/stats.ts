import { BODY_PARTS } from '../data/meta';
import type { BodyPart, SessionRecord } from '../types';
import { addDays, dayKey, startOfDay, startOfWeek } from './time';

export type Range = 'today' | '7d' | '30d' | 'all';

export function rangeStart(range: Range, now = Date.now()): number {
  const today = startOfDay(now);
  switch (range) {
    case 'today':
      return today.getTime();
    case '7d':
      return addDays(today, -6).getTime();
    case '30d':
      return addDays(today, -29).getTime();
    default:
      return 0;
  }
}

export function inRange(sessions: SessionRecord[], range: Range, now = Date.now()): SessionRecord[] {
  const from = rangeStart(range, now);
  return sessions.filter((s) => s.startedAt >= from);
}

const doneSets = (s: SessionRecord) => s.sets.filter((x) => x.status === 'done');

export function streaks(sessions: SessionRecord[], now = Date.now()) {
  const days = new Set(sessions.map((s) => dayKey(s.startedAt)));
  let current = 0;
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of sorted) {
    if (prev) {
      const [y, m, d] = prev.split('-').map(Number);
      run = dayKey(addDays(new Date(y, m - 1, d), 1)) === k ? run + 1 : 1;
    } else run = 1;
    longest = Math.max(longest, run);
    prev = k;
  }
  return { current, longest, activeDays: days.size };
}

export interface HeatCell {
  key: string;
  date: Date;
  sets: number;
  sessions: number;
  future: boolean;
}

/** Columns of Monday→Sunday cells covering the last `weeks` weeks. */
export function heatmap(sessions: SessionRecord[], weeks: number, now = Date.now()): HeatCell[][] {
  const byDay = new Map<string, { sets: number; sessions: number }>();
  for (const s of sessions) {
    const k = dayKey(s.startedAt);
    const cur = byDay.get(k) ?? { sets: 0, sessions: 0 };
    cur.sets += doneSets(s).length;
    cur.sessions += 1;
    byDay.set(k, cur);
  }
  const todayStart = startOfDay(now).getTime();
  const first = addDays(startOfWeek(now), -(weeks - 1) * 7);
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(first, w * 7 + d);
      const k = dayKey(date);
      const v = byDay.get(k);
      col.push({ key: k, date, sets: v?.sets ?? 0, sessions: v?.sessions ?? 0, future: date.getTime() > todayStart });
    }
    cols.push(col);
  }
  return cols;
}

export function sessionsPerWeek(sessions: SessionRecord[], weeks = 12, now = Date.now()) {
  const start = addDays(startOfWeek(now), -(weeks - 1) * 7);
  const rows = Array.from({ length: weeks }, (_, i) => {
    const ws = addDays(start, i * 7);
    return { weekStart: ws.getTime(), label: ws.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), sessions: 0, sets: 0 };
  });
  for (const s of sessions) {
    const idx = Math.round((startOfWeek(s.startedAt).getTime() - start.getTime()) / (7 * 864e5));
    if (idx >= 0 && idx < weeks) {
      rows[idx].sessions += 1;
      rows[idx].sets += doneSets(s).length;
    }
  }
  return rows;
}

export interface BodyPartRow {
  bodyPart: BodyPart;
  label: string;
  sets: number;
  reps: number;
  volumeKg: number;
  holdSec: number;
}

export function bodyPartBreakdown(sessions: SessionRecord[], range: Range, now = Date.now()): BodyPartRow[] {
  const rows = new Map<BodyPart, BodyPartRow>(BODY_PARTS.map((b) => [b.id, { bodyPart: b.id, label: b.label, sets: 0, reps: 0, volumeKg: 0, holdSec: 0 }]));
  for (const s of inRange(sessions, range, now)) {
    for (const set of doneSets(s)) {
      const r = rows.get(set.bodyPart);
      if (!r) continue;
      r.sets += 1;
      r.reps += set.reps ?? 0;
      r.volumeKg += (set.reps ?? 0) * (set.weightKg ?? 0);
      r.holdSec += set.durationSec ?? 0;
    }
  }
  return [...rows.values()];
}

export function breakTrend(sessions: SessionRecord[], limit = 30) {
  return sessions
    .filter((s) => s.breaks.length > 0)
    .slice(-limit)
    .map((s) => {
      const total = s.breaks.reduce((a, b) => a + b.durationSec, 0);
      return {
        id: s.id,
        label: new Date(s.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        avgSec: Math.round(total / s.breaks.length),
        totalMin: Math.round((total / 60) * 10) / 10,
        count: s.breaks.length,
      };
    });
}

export function topExercises(sessions: SessionRecord[], limit = 10) {
  const map = new Map<string, { exerciseId: string; name: string; sets: number; sessions: Set<string> }>();
  for (const s of sessions) {
    for (const set of doneSets(s)) {
      const cur = map.get(set.exerciseId) ?? { exerciseId: set.exerciseId, name: set.exerciseName, sets: 0, sessions: new Set<string>() };
      cur.sets += 1;
      cur.sessions.add(s.id);
      map.set(set.exerciseId, cur);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((r) => ({ exerciseId: r.exerciseId, name: r.name, sets: r.sets, sessions: r.sessions.size }));
}

export interface DayLog {
  key: string;
  sessions: SessionRecord[];
  durationSec: number;
  exercises: number;
  sets: number;
  reps: number;
  volumeKg: number;
  holdSec: number;
  breakCount: number;
  avgBreakSec: number | null;
}

/** Newest day first. */
export function dailyLog(sessions: SessionRecord[]): DayLog[] {
  const map = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const k = dayKey(s.startedAt);
    map.set(k, [...(map.get(k) ?? []), s]);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => {
      const sets = list.flatMap(doneSets);
      const breaks = list.flatMap((s) => s.breaks);
      const totalBreak = breaks.reduce((a, b) => a + b.durationSec, 0);
      return {
        key,
        sessions: [...list].sort((a, b) => a.startedAt - b.startedAt),
        durationSec: list.reduce((a, s) => a + s.durationSec, 0),
        exercises: new Set(sets.map((x) => x.exerciseId)).size,
        sets: sets.length,
        reps: sets.reduce((a, x) => a + (x.reps ?? 0), 0),
        volumeKg: sets.reduce((a, x) => a + (x.reps ?? 0) * (x.weightKg ?? 0), 0),
        holdSec: sets.reduce((a, x) => a + (x.durationSec ?? 0), 0),
        breakCount: breaks.length,
        avgBreakSec: breaks.length ? totalBreak / breaks.length : null,
      };
    });
}

export function totals(sessions: SessionRecord[]) {
  const sets = sessions.flatMap(doneSets);
  const breaks = sessions.flatMap((s) => s.breaks);
  return {
    sessions: sessions.length,
    sets: sets.length,
    timeSec: sessions.reduce((a, s) => a + s.durationSec, 0),
    avgBreakSec: breaks.length ? breaks.reduce((a, b) => a + b.durationSec, 0) / breaks.length : null,
  };
}
