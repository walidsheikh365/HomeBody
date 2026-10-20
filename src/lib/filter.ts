import type { Equipment, Exercise, Settings } from '../types';

export function isAvailable(ex: Exercise, equipment: Settings['equipment']): boolean {
  return ex.equipment.every((e: Equipment) => equipment[e]);
}

export function matchesSearch(ex: Exercise, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [ex.name, ex.cue, ex.bodyPart, ...(ex.secondary ?? []), ...ex.equipment].join(' ').toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}
