import { useState } from 'react';
import { useNavigate } from 'react-router';
import { EXERCISE_BY_ID } from '../../data/exercises';
import { WEIGHTED_EQUIPMENT } from '../../data/meta';
import { useAppStore } from '../../store/AppStore';
import {
  addExtraSet,
  canGoBack,
  completeSet,
  goBack,
  holdReset,
  holdSetMode,
  holdToggle,
  nextSet,
  prefillFor,
  skipExercise,
  skipSet,
  startBreak,
  totalPlannedSets,
} from '../../store/sessionEngine';
import type { ActiveSession, Position } from '../../types';
import { elapsedMs, useNow } from '../../lib/useNow';
import { useCrossing } from '../../lib/useCrossing';
import { useWakeLock } from '../../lib/wakeLock';
import { cues } from '../../lib/audio';
import { formatClock } from '../../lib/time';
import { fromDisplayWeight, toDisplayWeight } from '../../lib/units';
import { Segmented, Stepper } from '../../components/Controls';
import { PoseIcon } from '../../components/PoseIcon';
import { IconBack, IconCheck, IconCoffee, IconFlag, IconPause, IconPlay, IconPlus, IconReset, IconSkip, IconSkipAll } from '../../components/Icons';

export function GuidedSession({ active }: { active: ActiveSession }) {
  const { data, updateActive, finishActive, discardActive } = useAppStore();
  const navigate = useNavigate();
  const { settings } = data;
  const wake = useWakeLock(true);

  const holdRunning = active.hold.startedAt != null;
  const breakRunning = active.phase === 'between' && active.breakStartedAt != null;
  const now = useNow(true, holdRunning || breakRunning ? 200 : 1000);

  const breakMs = active.breakStartedAt != null ? now - active.breakStartedAt : null;
  useCrossing(breakRunning ? breakMs : null, settings.targetBreakSec != null ? settings.targetBreakSec * 1000 : null, cues.gentle);

  const planned = totalPlannedSets(active);
  const progress = planned ? Math.min(1, active.sets.length / planned) : 1;
  const anyDone = active.sets.some((s) => s.status === 'done');

  const end = () => {
    if (!anyDone) {
      if (confirm('No sets logged yet. Discard this session?')) {
        discardActive();
        navigate('/session');
      }
      return;
    }
    if (!confirm('Finish and save this session?')) return;
    const rec = finishActive();
    navigate(rec ? `/session/summary/${rec.id}` : '/session');
  };

  const pos = active.cursor;

  return (
    <main className="main">
      <div className="guided">
        <div className="row-between">
          <div className="muted small num">
            Session · {formatClock(now - active.startedAt)}
            {!wake.supported && <span className="tiny"> · screen may auto-lock</span>}
          </div>
          <button type="button" className="btn small" onClick={end}>
            <IconFlag /> End
          </button>
        </div>
        <div className="progress" aria-label={`${Math.round(progress * 100)}% complete`}>
          <div style={{ width: `${progress * 100}%` }} />
        </div>

        {active.phase === 'set' && pos ? (
          <SetPanel key={`${pos.item}-${pos.set}`} active={active} pos={pos} now={now} />
        ) : (
          <BetweenPanel active={active} breakMs={breakMs} onFinish={end} />
        )}

        <div className="secondary-actions">
          <button type="button" className="btn" disabled={!canGoBack(active)} onClick={() => updateActive(goBack)}>
            <IconBack />
            Back
          </button>
          <button type="button" className="btn" disabled={!pos} onClick={() => updateActive((a) => skipSet(a))}>
            <IconSkip />
            Skip set
          </button>
          <button type="button" className="btn" disabled={!pos} onClick={() => updateActive((a) => skipExercise(a))}>
            <IconSkipAll />
            Skip exercise
          </button>
          <button type="button" className="btn" onClick={() => updateActive(addExtraSet)}>
            <IconPlus />
            Extra set
          </button>
        </div>
      </div>
    </main>
  );
}

function positionLabel(active: ActiveSession, pos: Position) {
  return `Exercise ${pos.item + 1} of ${active.items.length} · Set ${pos.set + 1} of ${active.items[pos.item].sets}`;
}

function SetPanel({ active, pos, now }: { active: ActiveSession; pos: Position; now: number }) {
  const { data, updateActive } = useAppStore();
  const { settings, sessions } = data;
  const unit = settings.unit;
  const item = active.items[pos.item];
  const ex = EXERCISE_BY_ID[item.exerciseId];
  const prefill = prefillFor(active, pos, sessions);
  const weighted = ex ? ex.equipment.some((e) => WEIGHTED_EQUIPMENT.includes(e)) || prefill.weightKg != null : false;

  const [reps, setReps] = useState<number | undefined>(prefill.reps);
  const [weight, setWeight] = useState<number | undefined>(toDisplayWeight(prefill.weightKg, unit));

  const hold = active.hold;
  const holdMs = elapsedMs(hold.startedAt, hold.accumulatedMs, now);
  const target = item.targetSec ?? prefill.durationSec;
  const countdown = hold.mode === 'down' && target != null;
  // Beeps when the hold reaches its target, in both countdown and stopwatch mode.
  useCrossing(hold.startedAt != null ? holdMs : null, target != null ? target * 1000 : null, cues.done);

  if (!ex) return null;
  const timed = ex.kind === 'timed';

  const done = () => {
    const durationSec = timed ? (holdMs >= 1000 ? Math.round(holdMs / 1000) : prefill.durationSec) : undefined;
    updateActive((a) => completeSet(a, { reps: timed ? undefined : reps, weightKg: weighted ? fromDisplayWeight(weight, unit) : undefined, durationSec }, { autoBreak: settings.autoBreak }));
    cues.tick();
  };

  const setTarget = (v: number | undefined) =>
    updateActive((a) => ({ ...a, items: a.items.map((it, i) => (i === pos.item ? { ...it, targetSec: v } : it)) }));

  const remaining = target != null ? target * 1000 - holdMs : 0;
  const display = countdown ? (remaining >= 0 ? formatClock(Math.ceil(remaining / 1000) * 1000) : `+${formatClock(-remaining)}`) : formatClock(holdMs);

  return (
    <div className="stack-lg fade-in">
      <div className="set-head">
        <span className="pose-tile large" aria-hidden="true">
          <PoseIcon ex={ex} size={96} />
        </span>
        <div className="stack" style={{ gap: 6 }}>
          <div className="eyebrow num">{positionLabel(active, pos)}</div>
          <h1 className="ex-title">{ex.name}</h1>
        </div>
      </div>
      <p className="muted small">{ex.cue}</p>

      {timed ? (
        <div className="card stack" style={{ alignItems: 'center' }}>
          <Segmented
            label="Timer mode"
            value={hold.mode}
            onChange={(m) => updateActive((a) => holdSetMode(a, m))}
            options={[
              { value: 'up', label: 'Stopwatch' },
              { value: 'down', label: 'Countdown' },
            ]}
          />
          <div className={`timer-display${countdown && remaining < 0 ? ' over' : ''}`} role="timer" aria-live="off">
            {display}
          </div>
          <div className="row">
            <span className="field-label">Target (sec)</span>
            <Stepper label="target seconds" optional min={5} max={3600} step={5} start={30} value={target} onChange={setTarget} />
          </div>
          {hold.mode === 'down' && target == null && <p className="tiny muted">Set a target to count down from.</p>}
          <div className="row" style={{ width: '100%' }}>
            <button type="button" className="icon-btn" aria-label="Reset timer" onClick={() => updateActive(holdReset)} disabled={holdMs === 0}>
              <IconReset />
            </button>
            <button type="button" className="btn soft big grow" onClick={() => updateActive((a) => holdToggle(a))}>
              {hold.startedAt != null ? (
                <>
                  <IconPause /> Pause
                </>
              ) : (
                <>
                  <IconPlay /> {holdMs > 0 ? 'Resume' : 'Start'}
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card stack" style={{ alignItems: 'center' }}>
          <p className="target-line">{item.targetReps != null ? `Target · ${item.targetReps} reps` : 'Log your reps'}</p>
          <div className="stack" style={{ alignItems: 'center', gap: 6 }}>
            <span className="field-label">Reps</span>
            <Stepper big label="reps" optional min={0} max={500} start={item.targetReps ?? 10} value={reps} onChange={setReps} />
          </div>
        </div>
      )}

      {weighted && (
        <div className="card flat row-between">
          <span className="field-label">Weight ({unit})</span>
          <Stepper
            label={`weight in ${unit}`}
            optional
            decimal
            min={0}
            max={500}
            step={unit === 'kg' ? 0.5 : 1}
            start={unit === 'kg' ? 5 : 10}
            value={weight}
            onChange={setWeight}
          />
        </div>
      )}

      <button type="button" className="btn primary big block" onClick={done}>
        <IconCheck /> {timed ? 'Finish set' : 'Done'}
      </button>
    </div>
  );
}

function BetweenPanel({ active, breakMs, onFinish }: { active: ActiveSession; breakMs: number | null; onFinish: () => void }) {
  const { data, updateActive } = useAppStore();
  const target = data.settings.targetBreakSec;
  const last = active.lastDone;
  const lastEx = last ? EXERCISE_BY_ID[active.items[last.item]?.exerciseId] : undefined;
  const next = active.cursor;
  const nextEx = next ? EXERCISE_BY_ID[active.items[next.item].exerciseId] : undefined;

  if (!next) {
    return (
      <div className="stack-lg fade-in" style={{ flex: 1, justifyContent: 'center' }}>
        <div className="done-banner">
          <IconCheck /> Every set is done
        </div>
        <h1 className="ex-title">Nicely done.</h1>
        <p className="muted">Finish to save the session, or add an extra set if you have more in you.</p>
        <button type="button" className="btn primary big block" onClick={onFinish}>
          <IconFlag /> Finish session
        </button>
      </div>
    );
  }

  const over = target != null && breakMs != null && breakMs >= target * 1000;

  return (
    <div className="stack-lg fade-in">
      {active.phase === 'between' && last && lastEx && (
        <div className="done-banner">
          <IconCheck /> {lastEx.name} · set {last.set + 1} done
        </div>
      )}

      {active.phase === 'between' && (
        <div className="card stack" style={{ alignItems: 'center' }}>
          <span className="eyebrow">Rest</span>
          {breakMs != null ? (
            <>
              <div className={`timer-display${over ? ' over' : ''}`} role="timer" aria-live="off">
                {formatClock(breakMs)}
              </div>
              <p className="target-line small">
                {target == null ? 'Take the time you need' : over ? 'Target reached · go when ready' : `Target ${formatClock(target * 1000)}`}
              </p>
            </>
          ) : (
            <button type="button" className="btn soft big" onClick={() => updateActive((a) => startBreak(a))}>
              <IconCoffee /> Start break
            </button>
          )}
        </div>
      )}

      {nextEx && (
        <div className="card flat row">
          <span className="pose-tile" aria-hidden="true">
            <PoseIcon ex={nextEx} size={48} />
          </span>
          <div className="grow">
            <div className="eyebrow num">Up next · {positionLabel(active, next)}</div>
            <h2 style={{ marginTop: 4 }}>{nextEx.name}</h2>
          </div>
        </div>
      )}

      <button type="button" className="btn primary big block" onClick={() => updateActive((a) => nextSet(a))}>
        <IconPlay /> Next set
      </button>
    </div>
  );
}
