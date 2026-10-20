import { describe, expect, it } from 'vitest';
import { bodyPartBreakdown, dailyLog, sessionsPerWeek, streaks, topExercises } from '../lib/stats';
import { completeSet, finishSession, nextSet, startSession } from '../store/sessionEngine';

const DAY = 864e5;
function session(at: number) {
  let s = startSession(
    [
      { uid: '1', exerciseId: 'push-up', sets: 2 },
      { uid: '2', exerciseId: 'db-goblet-squat', sets: 1 },
    ],
    at,
  );
  s = completeSet(s, { reps: 10 }, { autoBreak: true }, at + 60_000);
  s = nextSet(s, at + 120_000);
  s = completeSet(s, { reps: 8 }, { autoBreak: true }, at + 180_000);
  s = nextSet(s, at + 270_000);
  s = completeSet(s, { reps: 12, weightKg: 10 }, { autoBreak: true }, at + 330_000);
  return finishSession(s, at + 340_000);
}

describe('stats', () => {
  const now = new Date(2026, 9, 20, 18, 0).getTime();
  const sessions = [session(now - 3 * DAY), session(now - DAY), session(now - 1000 * 60 * 60)];

  it('computes streaks', () => {
    expect(streaks(sessions, now)).toEqual({ current: 2, longest: 2, activeDays: 3 });
  });

  it('breaks down by body part and range', () => {
    const all = bodyPartBreakdown(sessions, 'all', now);
    expect(all.find((r) => r.bodyPart === 'chest')!.sets).toBe(6);
    expect(all.find((r) => r.bodyPart === 'legs')).toMatchObject({ sets: 3, volumeKg: 360 });
    const today = bodyPartBreakdown(sessions, 'today', now);
    expect(today.find((r) => r.bodyPart === 'chest')!.sets).toBe(2);
  });

  it('builds weekly counts, top exercises and the daily log', () => {
    const weeks = sessionsPerWeek(sessions, 4, now);
    expect(weeks.reduce((a, w) => a + w.sessions, 0)).toBe(3);
    expect(topExercises(sessions)[0]).toMatchObject({ exerciseId: 'push-up', sets: 6, sessions: 3 });
    const log = dailyLog(sessions);
    expect(log).toHaveLength(3);
    expect(log[0].sessions[0].startedAt).toBe(sessions[2].startedAt);
    expect(log[0]).toMatchObject({ exercises: 2, sets: 3, reps: 30, breakCount: 2, avgBreakSec: 75 });
  });
});
