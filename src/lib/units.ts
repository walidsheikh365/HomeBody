import type { WeightUnit } from '../types';

const LB_PER_KG = 2.20462262;

export function toDisplayWeight(kg: number | undefined, unit: WeightUnit): number | undefined {
  if (kg == null) return undefined;
  const v = unit === 'kg' ? kg : kg * LB_PER_KG;
  return Math.round(v * 10) / 10;
}

export function fromDisplayWeight(value: number | undefined, unit: WeightUnit): number | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return unit === 'kg' ? value : value / LB_PER_KG;
}

export function formatWeight(kg: number | undefined, unit: WeightUnit): string {
  const v = toDisplayWeight(kg, unit);
  return v == null ? '' : `${v} ${unit}`;
}

/** Volume (reps × load) shown in the user's unit, rounded. */
export function formatVolume(kgReps: number, unit: WeightUnit): string {
  const v = unit === 'kg' ? kgReps : kgReps * LB_PER_KG;
  return `${Math.round(v).toLocaleString()} ${unit}`;
}
