/**
 * Tiny stick-figure engine. A pose is a set of joint angles on a fixed
 * skeleton (side view facing right, or front view). Geometry is computed,
 * equipment props are attached to joints, then everything is fitted into a
 * 64×64 box and grounded on a floor line.
 *
 * Angles are in degrees, screen space: 0 = right, 90 = down, 180 = left, -90 = up.
 */
export type Pt = [number, number];
export type Joint = 'hip' | 'neck' | 'head' | 'elbowN' | 'handN' | 'elbowF' | 'handF' | 'kneeN' | 'footN' | 'kneeF' | 'footF' | 'hands';

/** A point relative to a joint: [joint, dx, dy] in skeleton units. */
export type Anchor = [Joint, number, number];

export interface PoseOpts {
  /** Front view: both sides drawn at full strength. */
  front?: boolean;
  head?: number;
  /** false = airborne / no floor contact. */
  ground?: boolean;
  /** Which hands hold dumbbells. */
  hold?: 'both' | 'near' | 'far' | 'mid' | 'none';
  /** Gym ball: anchor of its centre and radius. */
  ball?: [Joint, number, number, number?];
  /** Medicine ball centre. Default: between the hands. */
  mball?: Anchor;
  /** Band from → to. Default: near hand → near foot. */
  band?: [Anchor, Anchor];
  wheel?: 'hands' | 'feet';
  wall?: 'left' | 'right';
}

export interface Pose extends PoseOpts {
  torso: number;
  armN: [number, number];
  armF: [number, number];
  legN: [number, number];
  legF: [number, number];
}

export const P = (
  torso: number,
  armN: [number, number],
  armF: [number, number],
  legN: [number, number],
  legF: [number, number],
  opts: PoseOpts = {},
): Pose => ({ torso, armN, armF, legN, legF, ...opts });

const L = { torso: 18, head: 6.4, upper: 9, fore: 8.5, thigh: 11.5, shin: 11.5 };
const HEAD_R = 4.3;

const dir = (deg: number): Pt => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const add = (p: Pt, d: Pt, len: number): Pt => [p[0] + d[0] * len, p[1] + d[1] * len];

export interface Equip {
  dumbbells?: boolean;
  bands?: boolean;
  medball?: boolean;
  abwheel?: boolean;
  gymball?: boolean;
  wall?: boolean;
}

export type Shape =
  | { t: 'line'; a: Pt; b: Pt; w: number; o: number; prop?: boolean }
  | { t: 'circle'; c: Pt; r: number; fill: boolean; o: number; prop?: boolean; w?: number }
  | { t: 'dumbbell'; c: Pt; angle: number }
  | { t: 'wheel'; c: Pt };

export interface Figure {
  shapes: Shape[];
  floor: number;
  wall: number | null;
}

export function buildFigure(pose: Pose, equip: Equip): Figure {
  const hip: Pt = [0, 0];
  const td = dir(pose.torso);
  const neck = add(hip, td, L.torso);
  const head = add(neck, dir(pose.head ?? pose.torso), L.head);
  const shoulder = add(neck, td, -1.5);
  const elbowN = add(shoulder, dir(pose.armN[0]), L.upper);
  const handN = add(elbowN, dir(pose.armN[1]), L.fore);
  const elbowF = add(shoulder, dir(pose.armF[0]), L.upper);
  const handF = add(elbowF, dir(pose.armF[1]), L.fore);
  const kneeN = add(hip, dir(pose.legN[0]), L.thigh);
  const footN = add(kneeN, dir(pose.legN[1]), L.shin);
  const kneeF = add(hip, dir(pose.legF[0]), L.thigh);
  const footF = add(kneeF, dir(pose.legF[1]), L.shin);
  const hands: Pt = [(handN[0] + handF[0]) / 2, (handN[1] + handF[1]) / 2];
  const J: Record<Joint, Pt> = { hip, neck, head, elbowN, handN, elbowF, handF, kneeN, footN, kneeF, footF, hands };
  const at = (a: Anchor): Pt => [J[a[0]][0] + a[1], J[a[0]][1] + a[2]];

  const far = pose.front ? 1 : 0.4;
  const s: Shape[] = [];
  const limb = (a: Pt, b: Pt, w: number, o: number) => s.push({ t: 'line', a, b, w, o });

  // Gym ball sits behind the body.
  if (equip.gymball) {
    const b = pose.ball ?? ['hip', 0, 10, 9];
    s.push({ t: 'circle', c: at([b[0], b[1], b[2]]), r: b[3] ?? 9, fill: false, o: 1, prop: true, w: 2.4 });
  }
  // Far limbs first so near limbs sit on top.
  limb(hip, kneeF, 3.4, far);
  limb(kneeF, footF, 3.4, far);
  limb(shoulder, elbowF, 3.2, far);
  limb(elbowF, handF, 3.2, far);
  limb(hip, neck, 3.8, 1);
  s.push({ t: 'circle', c: head, r: HEAD_R, fill: true, o: 1 });
  limb(hip, kneeN, 3.4, 1);
  limb(kneeN, footN, 3.4, 1);
  limb(shoulder, elbowN, 3.2, 1);
  limb(elbowN, handN, 3.2, 1);

  if (equip.bands) {
    const [from, to] = pose.band ?? [
      ['handN', 0, 0],
      ['footN', 0, 0],
    ];
    s.push({ t: 'line', a: at(from), b: at(to), w: 1.8, o: 1, prop: true });
  }
  if (equip.dumbbells) {
    const hold = pose.hold ?? 'both';
    const ang = (e: Pt, h: Pt) => (Math.atan2(h[1] - e[1], h[0] - e[0]) * 180) / Math.PI + 90;
    if (hold === 'both' || hold === 'far') s.push({ t: 'dumbbell', c: handF, angle: ang(elbowF, handF) });
    if (hold === 'both' || hold === 'near') s.push({ t: 'dumbbell', c: handN, angle: ang(elbowN, handN) });
    if (hold === 'mid') s.push({ t: 'dumbbell', c: hands, angle: 90 });
  }
  if (equip.medball) {
    s.push({ t: 'circle', c: at(pose.mball ?? ['hands', 0, 0]), r: 4.6, fill: true, o: 1, prop: true });
  }
  if (equip.abwheel) {
    const c: Pt = pose.wheel === 'feet' ? [(footN[0] + footF[0]) / 2, Math.max(footN[1], footF[1]) + 2] : [hands[0], hands[1] + 2];
    s.push({ t: 'wheel', c });
  }

  return fit(s, pose, equip);
}

function extent(s: Shape): [number, number, number, number] {
  switch (s.t) {
    case 'line':
      return [Math.min(s.a[0], s.b[0]) - s.w / 2, Math.min(s.a[1], s.b[1]) - s.w / 2, Math.max(s.a[0], s.b[0]) + s.w / 2, Math.max(s.a[1], s.b[1]) + s.w / 2];
    case 'circle':
      return [s.c[0] - s.r, s.c[1] - s.r, s.c[0] + s.r, s.c[1] + s.r];
    case 'dumbbell':
      return [s.c[0] - 4.5, s.c[1] - 4.5, s.c[0] + 4.5, s.c[1] + 4.5];
    case 'wheel':
      return [s.c[0] - 4, s.c[1] - 4, s.c[0] + 4, s.c[1] + 4];
  }
}

const BOX = { x0: 5, y0: 5, x1: 59, y1: 57 };

function fit(shapes: Shape[], pose: Pose, equip: Equip): Figure {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const sh of shapes) {
    const e = extent(sh);
    x0 = Math.min(x0, e[0]);
    y0 = Math.min(y0, e[1]);
    x1 = Math.max(x1, e[2]);
    y1 = Math.max(y1, e[3]);
  }
  const wallSide = pose.wall ?? (equip.wall ? 'right' : undefined);
  const wallPad = wallSide ? 4 : 0;
  const lift = pose.ground === false ? 5 : 0;
  const scale = Math.min(1.3, (BOX.x1 - BOX.x0 - wallPad) / (x1 - x0), (BOX.y1 - BOX.y0 - lift) / (y1 - y0));
  const w = (x1 - x0) * scale;
  const h = (y1 - y0) * scale;
  let ox = BOX.x0 + (BOX.x1 - BOX.x0 - w) / 2;
  if (wallSide === 'left') ox = BOX.x0 + wallPad;
  if (wallSide === 'right') ox = BOX.x1 - wallPad - w;
  const oy = BOX.y1 - lift - h;
  const T = (p: Pt): Pt => [ox + (p[0] - x0) * scale, oy + (p[1] - y0) * scale];

  const out = shapes.map((sh): Shape => {
    if (sh.t === 'line') return { ...sh, a: T(sh.a), b: T(sh.b) };
    if (sh.t === 'circle') return { ...sh, c: T(sh.c), r: sh.r * scale };
    return { ...sh, c: T(sh.c) };
  });
  return {
    shapes: out,
    floor: BOX.y1 + 1.5,
    wall: wallSide ? (wallSide === 'left' ? ox - 1.5 : ox + w + 1.5) : null,
  };
}
