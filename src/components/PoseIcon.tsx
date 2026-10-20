import { memo } from 'react';
import type { Exercise } from '../types';
import { figureFor } from '../figures/map';
import type { Shape } from '../figures/engine';

const FIG = 'var(--text)';
const PROP = 'var(--accent-text)';

function renderShape(s: Shape, i: number) {
  switch (s.t) {
    case 'line':
      return (
        <line
          key={i}
          x1={s.a[0]}
          y1={s.a[1]}
          x2={s.b[0]}
          y2={s.b[1]}
          stroke={s.prop ? PROP : FIG}
          strokeWidth={s.w}
          strokeOpacity={s.o}
          strokeLinecap="round"
        />
      );
    case 'circle':
      return s.fill ? (
        <circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.r} fill={s.prop ? PROP : FIG} fillOpacity={s.prop ? 0.9 : s.o} />
      ) : (
        <circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.r} fill="none" stroke={s.prop ? PROP : FIG} strokeWidth={s.w ?? 2} strokeOpacity={0.85} />
      );
    case 'dumbbell':
      return (
        <g key={i} transform={`translate(${s.c[0]} ${s.c[1]}) rotate(${s.angle})`} stroke={PROP} strokeLinecap="round">
          <line x1={-3.6} y1={0} x2={3.6} y2={0} strokeWidth={1.8} />
          <line x1={-3.6} y1={-2.4} x2={-3.6} y2={2.4} strokeWidth={2.6} />
          <line x1={3.6} y1={-2.4} x2={3.6} y2={2.4} strokeWidth={2.6} />
        </g>
      );
    case 'wheel':
      return (
        <g key={i}>
          <circle cx={s.c[0]} cy={s.c[1]} r={3.6} fill="none" stroke={PROP} strokeWidth={2.2} />
          <line x1={s.c[0] - 5.5} y1={s.c[1]} x2={s.c[0] + 5.5} y2={s.c[1]} stroke={PROP} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      );
  }
}

/** Stick-figure illustration of an exercise's pose, drawn in the active theme's colours. */
export const PoseIcon = memo(function PoseIcon({ ex, size = 44, className }: { ex: Exercise; size?: number; className?: string }) {
  const fig = figureFor(ex);
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label={`${ex.name} pose`}>
      <line x1={6} y1={fig.floor} x2={58} y2={fig.floor} stroke={FIG} strokeOpacity={0.18} strokeWidth={1.5} strokeLinecap="round" />
      {fig.wall != null && <line x1={fig.wall} y1={4} x2={fig.wall} y2={fig.floor} stroke={FIG} strokeOpacity={0.3} strokeWidth={2.2} strokeLinecap="round" />}
      {fig.shapes.map(renderShape)}
    </svg>
  );
});
