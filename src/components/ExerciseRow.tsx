import { memo, useState } from 'react';
import { BODY_PART_LABEL, EQUIPMENT_SHORT } from '../data/meta';
import type { Exercise } from '../types';
import { IconCheck, IconPlus } from './Icons';
import { PoseIcon } from './PoseIcon';

export function ExerciseTags({ ex, showBodyPart }: { ex: Exercise; showBodyPart?: boolean }) {
  return (
    <div className="tags">
      {showBodyPart && <span className="tag accent">{BODY_PART_LABEL[ex.bodyPart]}</span>}
      {ex.equipment.map((e) => (
        <span key={e} className="tag">
          {EQUIPMENT_SHORT[e]}
        </span>
      ))}
      {ex.kind === 'timed' && <span className="tag accent">Hold</span>}
    </div>
  );
}

export const ExerciseRow = memo(function ExerciseRow({
  ex,
  added,
  removable,
  onToggle,
  showBodyPart,
}: {
  ex: Exercise;
  added: boolean;
  removable: boolean;
  onToggle: (id: string) => void;
  showBodyPart?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="ex-row">
      <span className="pose-tile" aria-hidden="true">
        <PoseIcon ex={ex} size={48} />
      </span>
      <button type="button" className="info" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <div className="name">{ex.name}</div>
        <div className="cue">{ex.cue}</div>
        {open && ex.secondary && <div className="tiny muted" style={{ marginTop: 4 }}>Also works: {ex.secondary.join(', ')}</div>}
        <ExerciseTags ex={ex} showBodyPart={showBodyPart} />
      </button>
      <button
        type="button"
        className={`icon-btn${added ? ' added' : ''}`}
        aria-pressed={added}
        aria-label={added ? `Remove ${ex.name} from session` : `Add ${ex.name} to session`}
        disabled={added && !removable}
        onClick={() => onToggle(ex.id)}
      >
        {added ? <IconCheck /> : <IconPlus />}
      </button>
    </li>
  );
});
