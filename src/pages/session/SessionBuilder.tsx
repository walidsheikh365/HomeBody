import { Link, useNavigate } from 'react-router';
import { EXERCISE_BY_ID } from '../../data/exercises';
import { WEIGHTED_EQUIPMENT } from '../../data/meta';
import { useAppStore } from '../../store/AppStore';
import { fromDisplayWeight, toDisplayWeight } from '../../lib/units';
import { formatDuration } from '../../lib/time';
import { EmptyState, Stepper } from '../../components/Controls';
import { ExerciseTags } from '../../components/ExerciseRow';
import { PoseIcon } from '../../components/PoseIcon';
import { IconDown, IconList, IconPlay, IconReset, IconTrash, IconUp } from '../../components/Icons';

export function SessionBuilder() {
  const { data, updateDraftItem, moveDraftItem, removeDraftItem, clearDraft, replaceDraft, startFromDraft } = useAppStore();
  const navigate = useNavigate();
  const items = data.draft.items.filter((i) => EXERCISE_BY_ID[i.exerciseId]);
  const unit = data.settings.unit;
  const totalSets = items.reduce((a, i) => a + i.sets, 0);
  const last = data.sessions[data.sessions.length - 1];

  const repeatLast = () => {
    if (!last) return;
    replaceDraft(last.items.filter((i) => EXERCISE_BY_ID[i.exerciseId]).map(({ uid: _u, ...rest }) => rest));
  };

  if (items.length === 0) {
    return (
      <main className="main">
        <header className="page-header">
          <h1>Session</h1>
        </header>
        <div className="card">
          <EmptyState
            icon={<IconList />}
            title="Your session is empty"
            action={
              <div className="row wrap" style={{ justifyContent: 'center' }}>
                <Link to="/exercises" className="btn primary">
                  Browse exercises
                </Link>
                {last && (
                  <button type="button" className="btn soft" onClick={repeatLast}>
                    <IconReset /> Repeat last session
                  </button>
                )}
              </div>
            }
          >
            Tap <strong>+</strong> next to any exercise in the library to add it here.
          </EmptyState>
        </div>
      </main>
    );
  }

  return (
    <main className="main">
      <header className="page-header">
        <div>
          <h1>Session</h1>
          <p className="muted small">
            {items.length} {items.length === 1 ? 'exercise' : 'exercises'} · {totalSets} sets
          </p>
        </div>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => {
            if (confirm('Clear all exercises from this session?')) clearDraft();
          }}
        >
          Clear
        </button>
      </header>

      <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, idx) => {
          const ex = EXERCISE_BY_ID[item.exerciseId];
          const weighted = ex.equipment.some((e) => WEIGHTED_EQUIPMENT.includes(e));
          return (
            <li key={item.uid} className="card plan-item fade-in">
              <div className="top">
                <span className="pose-tile numbered" aria-hidden="true">
                  <PoseIcon ex={ex} size={52} />
                  <span className="idx num">{idx + 1}</span>
                </span>
                <div className="grow">
                  <h3>{ex.name}</h3>
                  <ExerciseTags ex={ex} showBodyPart />
                </div>
                <div className="reorder">
                  <button type="button" className="icon-btn" aria-label={`Move ${ex.name} up`} disabled={idx === 0} onClick={() => moveDraftItem(item.uid, -1)}>
                    <IconUp />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Move ${ex.name} down`}
                    disabled={idx === items.length - 1}
                    onClick={() => moveDraftItem(item.uid, 1)}
                  >
                    <IconDown />
                  </button>
                </div>
              </div>
              <div className="fields">
                <div>
                  <span className="field-label">Sets</span>
                  <Stepper label="sets" value={item.sets} min={1} max={20} onChange={(v) => updateDraftItem(item.uid, { sets: v ?? 1 })} />
                </div>
                {ex.kind === 'reps' ? (
                  <div>
                    <span className="field-label">Target reps</span>
                    <Stepper
                      label="target reps"
                      optional
                      min={1}
                      max={500}
                      start={10}
                      value={item.targetReps}
                      onChange={(v) => updateDraftItem(item.uid, { targetReps: v })}
                    />
                  </div>
                ) : (
                  <div>
                    <span className="field-label">Target time (sec)</span>
                    <Stepper
                      label="target seconds"
                      optional
                      min={5}
                      max={3600}
                      step={5}
                      start={30}
                      value={item.targetSec}
                      onChange={(v) => updateDraftItem(item.uid, { targetSec: v })}
                    />
                  </div>
                )}
                {weighted && (
                  <div>
                    <span className="field-label">Weight ({unit})</span>
                    <Stepper
                      label={`weight in ${unit}`}
                      optional
                      decimal
                      min={0}
                      max={500}
                      step={unit === 'kg' ? 0.5 : 1}
                      start={unit === 'kg' ? 5 : 10}
                      value={toDisplayWeight(item.weightKg, unit)}
                      onChange={(v) => updateDraftItem(item.uid, { weightKg: fromDisplayWeight(v, unit) })}
                    />
                  </div>
                )}
              </div>
              <div className="row-between">
                <span className="tiny muted">
                  {item.sets} × {ex.kind === 'timed' ? (item.targetSec != null ? formatDuration(item.targetSec) : 'hold') : item.targetReps != null ? `${item.targetReps} reps` : 'reps'}
                </span>
                <button type="button" className="btn ghost small" aria-label={`Remove ${ex.name}`} onClick={() => removeDraftItem(item.uid)}>
                  <IconTrash /> Remove
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="sticky-cta">
        <button
          type="button"
          className="btn primary big block"
          onClick={() => {
            startFromDraft();
            navigate('/session');
          }}
        >
          <IconPlay /> Start session
        </button>
      </div>
    </main>
  );
}
