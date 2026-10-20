import type { BodyPart, Equipment } from '../types';

/** Top-to-bottom order of the body. */
export const BODY_PARTS: { id: BodyPart; label: string }[] = [
  { id: 'shoulders', label: 'Shoulders & Neck' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'wrists', label: 'Wrists & Grip' },
  { id: 'abs', label: 'Abdominals' },
  { id: 'legs', label: 'Legs & Glutes' },
];

export const EQUIPMENT: { id: Equipment; label: string; short: string }[] = [
  { id: 'bodyweight', label: 'Bodyweight', short: 'BW' },
  { id: 'wall', label: 'Wall', short: 'Wall' },
  { id: 'dumbbells', label: 'Dumbbells', short: 'DB' },
  { id: 'bands', label: 'Exercise bands', short: 'Band' },
  { id: 'abwheel', label: 'Ab wheel', short: 'Wheel' },
  { id: 'medball', label: 'Medicine ball', short: 'Med ball' },
  { id: 'gymball', label: 'Gym ball', short: 'Gym ball' },
];

export const BODY_PART_LABEL = Object.fromEntries(BODY_PARTS.map((b) => [b.id, b.label])) as Record<BodyPart, string>;
export const EQUIPMENT_LABEL = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e.label])) as Record<Equipment, string>;
export const EQUIPMENT_SHORT = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e.short])) as Record<Equipment, string>;

/** Equipment for which logging a weight / resistance makes sense. */
export const WEIGHTED_EQUIPMENT: Equipment[] = ['dumbbells', 'bands', 'medball'];
