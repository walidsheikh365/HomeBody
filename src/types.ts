export type BodyPart = 'shoulders' | 'chest' | 'back' | 'triceps' | 'biceps' | 'wrists' | 'abs' | 'legs';

export type Equipment = 'bodyweight' | 'wall' | 'dumbbells' | 'bands' | 'abwheel' | 'medball' | 'gymball';

/** reps = counted repetitions, timed = holds / timed work (planks, wall sits). */
export type ExerciseKind = 'reps' | 'timed';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  secondary?: string[];
  /** All items must be toggled on for the exercise to show. The mat is always assumed. */
  equipment: Equipment[];
  cue: string;
  kind: ExerciseKind;
}

export type ThemeId = 'soleil' | 'luna' | 'aurora';
export type WeightUnit = 'kg' | 'lb';
export type BrowseMode = 'bodyPart' | 'equipment';

export interface Settings {
  theme: ThemeId;
  equipment: Record<Equipment, boolean>;
  defaultSets: number;
  autoBreak: boolean;
  /** Gentle beep when a break reaches this length. null = no target. */
  targetBreakSec: number | null;
  sound: boolean;
  unit: WeightUnit;
  browseMode: BrowseMode;
}

/** One exercise in a planned session. Weights are always stored in kg. */
export interface PlanItem {
  uid: string;
  exerciseId: string;
  sets: number;
  targetReps?: number;
  targetSec?: number;
  weightKg?: number;
}

export interface Draft {
  items: PlanItem[];
  updatedAt: number;
}

export interface SetLog {
  id: string;
  sessionId: string;
  itemIndex: number;
  setIndex: number;
  exerciseId: string;
  exerciseName: string;
  bodyPart: BodyPart;
  kind: ExerciseKind;
  status: 'done' | 'skipped';
  reps?: number;
  weightKg?: number;
  durationSec?: number;
  completedAt: number;
}

/** A rest between sets. Linked to the set it followed. */
export interface BreakLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  itemIndex: number;
  setIndex: number;
  startedAt: number;
  endedAt: number;
  durationSec: number;
}

export interface HoldTimer {
  mode: 'up' | 'down';
  startedAt: number | null;
  accumulatedMs: number;
}

export interface Position {
  item: number;
  set: number;
}

export interface ActiveSession {
  id: string;
  startedAt: number;
  items: PlanItem[];
  /** The next set to perform. null when every set has been done or skipped. */
  cursor: Position | null;
  /** 'set' = performing the set at cursor. 'between' = a set was just finished. */
  phase: 'set' | 'between';
  breakStartedAt: number | null;
  lastDone: Position | null;
  sets: SetLog[];
  breaks: BreakLog[];
  hold: HoldTimer;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  items: PlanItem[];
  sets: SetLog[];
  breaks: BreakLog[];
}

export interface StopwatchState {
  startedAt: number | null;
  accumulatedMs: number;
  laps: number[];
}

export interface CountdownState {
  durationSec: number;
  startedAt: number | null;
  accumulatedMs: number;
}

export interface BreakTimerState {
  startedAt: number | null;
  recent: number[];
}

export interface TimerState {
  tab: 'stopwatch' | 'countdown' | 'break';
  stopwatch: StopwatchState;
  countdown: CountdownState;
  breakTimer: BreakTimerState;
}

export interface AppData {
  settings: Settings;
  draft: Draft;
  active: ActiveSession | null;
  sessions: SessionRecord[];
  timers: TimerState;
}

export interface ExportBundle {
  app: 'homebody';
  version: 1;
  exportedAt: string;
  data: AppData;
}
