import type { Exercise } from '../types';

/**
 * Curated popularity ranking, most popular first. Used to order every browse group
 * (body part or equipment), so each mixes equipment sensibly. Unlisted exercises
 * follow in library order.
 */
export const RANKED: string[] = [
  // Household-name staples
  'push-up', 'bw-squat', 'plank', 'crunch', 'db-curl', 'glute-bridge', 'forward-lunge',
  'db-overhead-press', 'db-goblet-squat', 'db-bent-over-row', 'db-lateral-raise', 'sit-up',
  'mountain-climbers', 'burpee', 'jumping-jacks', 'db-romanian-deadlift', 'db-hammer-curl',
  'russian-twist', 'bicycle-crunch', 'lying-leg-raise', 'superman', 'wall-sit', 'calf-raise',
  'reverse-lunge', 'db-floor-press', 'diamond-push-up', 'db-single-arm-row',
  'db-overhead-triceps-extension', 'side-plank', 'ab-wheel-rollout', 'medball-slam',
  'medball-wall-ball', 'band-pull-apart', 'band-face-pull', 'band-curl', 'band-lateral-walk',
  'db-shrug', 'db-skull-crusher', 'db-kickback', 'pike-push-up', 'knee-push-up', 'wide-push-up',
  'floor-dip', 'jump-squat', 'dead-bug', 'bird-dog', 'high-knees', 'flutter-kicks',
  // Very common
  'db-deadlift', 'db-hip-thrust', 'db-split-squat', 'db-reverse-lunge', 'db-rear-delt-fly',
  'db-front-raise', 'db-arnold-press', 'db-wrist-curl', 'db-reverse-wrist-curl', 'db-farmers-hold',
  'band-overhead-press', 'band-seated-row', 'band-chest-press', 'band-triceps-pushdown',
  'band-squat', 'band-glute-bridge', 'band-lat-pulldown', 'band-bent-over-row', 'band-lateral-raise',
  'medball-russian-twist', 'medball-goblet-squat', 'medball-chest-pass', 'medball-overhead-press',
  'medball-v-up', 'medball-woodchop', 'gymball-crunch', 'gymball-hamstring-curl', 'gymball-plank',
  'gymball-knee-tuck', 'gymball-db-chest-press', 'gymball-back-extension', 'gymball-glute-bridge',
  'gymball-wall-squat', 'gymball-pike', 'gymball-rollout', 'wall-push-up', 'wall-handstand-hold',
  'wall-walk', 'wall-angels', 'wall-calf-raise', 'single-leg-wall-sit', 'ab-wheel-knee-tuck',
  'ab-wheel-standing-rollout', 'ab-wheel-oblique-rollout', 'sumo-squat', 'walking-lunge',
  'split-squat', 'single-leg-glute-bridge', 'donkey-kick', 'fire-hydrant', 'clamshell',
  'lateral-lunge', 'v-up', 'hollow-hold', 'reverse-crunch', 'heel-taps', 'plank-shoulder-taps',
  'high-plank', 'close-grip-push-up', 'db-concentration-curl', 'db-zottman-curl', 'arm-circles',
  'inchworm', 'cat-cow', 'childs-pose', 'db-gorilla-row', 'db-renegade-row', 'db-thruster',
  'db-swing', 'db-calf-raise', 'db-sumo-squat', 'db-single-leg-rdl', 'db-lateral-lunge',
  'db-russian-twist', 'db-side-bend', 'db-woodchop', 'db-weighted-crunch', 'db-squeeze-press',
  'db-pullover', 'db-floor-fly', 'db-upright-row', 'db-external-rotation', 'db-close-grip-floor-press',
  'band-pallof-press', 'band-woodchop', 'band-hammer-curl', 'band-overhead-triceps-extension',
  'band-triceps-kickback', 'band-chest-fly', 'band-push-up', 'band-front-raise', 'band-upright-row',
  'band-external-rotation', 'band-pass-through', 'band-deadlift', 'band-good-morning',
  'band-straight-arm-pulldown', 'band-monster-walk', 'band-glute-kickback', 'band-clamshell',
  'band-reverse-curl', 'band-wrist-flexion', 'band-wrist-extension', 'band-kneeling-crunch',
  'medball-push-up', 'medball-situp-throw', 'medball-rotational-throw', 'medball-lunge-twist',
  'medball-deadlift', 'medball-halo', 'medball-overhead-throw', 'medball-close-grip-push-up',
  'medball-curl', 'gymball-push-up', 'gymball-decline-push-up', 'gymball-db-fly', 'gymball-dip',
  'gymball-db-chest-supported-row', 'gymball-stir-the-pot', 'gymball-bulgarian-split-squat',
  'gymball-preacher-curl', 'gymball-spider-curl', 'gymball-prone-ytw', 'gymball-pass',
  // Bodyweight specialists
  'prone-y-raise', 'prone-t-raise', 'reverse-snow-angels', 'swimmers', 'superman-hold',
  'bw-good-morning', 'plank-to-pike', 'archer-push-up', 'clap-push-up', 'hindu-push-up',
  'staggered-push-up', 'cossack-squat', 'pistol-squat', 'curtsy-lunge', 'single-leg-rdl',
  'single-leg-calf-raise', 'hip-flexor-stretch', 'skater-hops', 'squat-hold', 'glute-bridge-hold',
  'glute-bridge-march', 'frog-pumps', 'side-lying-leg-raise', 'toe-touch-crunch', 'bear-plank',
  'plank-up-down', 'side-plank-hip-dip', 'scissor-kicks', 'windshield-wipers', 'chin-tucks',
  'wrist-circles', 'knuckle-push-up', 'wrist-flexor-stretch', 'wrist-extensor-stretch',
  'quadruped-wrist-rocks', 'fingertip-plank', 'db-reverse-curl', 'db-pronation-supination',
];

const RANK = new Map(RANKED.map((id, i) => [id, i]));

/** Stable sort, most popular first. */
export function byPopularity(list: Exercise[]): Exercise[] {
  return list
    .map((e, i) => ({ e, r: RANK.get(e.id) ?? RANKED.length + i }))
    .sort((a, b) => a.r - b.r)
    .map(({ e }) => e);
}
