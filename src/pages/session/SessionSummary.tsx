import { Link, useParams } from 'react-router';
import { useAppStore } from '../../store/AppStore';
import { summarize } from '../../store/sessionEngine';
import { formatDuration, formatTimeOfDay } from '../../lib/time';
import { formatVolume } from '../../lib/units';
import { SessionDetail } from '../../components/SessionDetail';
import { EmptyState } from '../../components/Controls';
import { IconCheck, IconList } from '../../components/Icons';

export function SessionSummary() {
  const { id } = useParams();
  const { data } = useAppStore();
  const session = data.sessions.find((s) => s.id === id);

  if (!session) {
    return (
      <main className="main">
        <EmptyState icon={<IconList />} title="Session not found" action={<Link to="/session" className="btn primary">Back to session</Link>} />
      </main>
    );
  }

  const s = summarize(session);
  return (
    <main className="main">
      <div className="stack-lg fade-in">
        <div className="stack" style={{ gap: 6 }}>
          <div className="done-banner">
            <IconCheck /> Session saved
          </div>
          <h1>Well done.</h1>
          <p className="muted small">
            {new Date(session.startedAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            {formatTimeOfDay(session.startedAt)}–{formatTimeOfDay(session.endedAt)}
          </p>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <div className="value">{formatDuration(s.totalSec)}</div>
            <div className="label">Total time</div>
          </div>
          <div className="stat">
            <div className="value">{s.exercisesDone}</div>
            <div className="label">Exercises done</div>
          </div>
          <div className="stat">
            <div className="value">{s.setsDone}</div>
            <div className="label">Total sets{s.setsSkipped ? ` · ${s.setsSkipped} skipped` : ''}</div>
          </div>
          <div className="stat">
            <div className="value">{s.avgBreakSec != null ? formatDuration(s.avgBreakSec) : '—'}</div>
            <div className="label">Average break</div>
          </div>
        </div>

        {(s.totalReps > 0 || s.holdSec > 0 || s.volumeKg > 0) && (
          <p className="muted small">
            {[
              s.totalReps > 0 && `${s.totalReps} reps`,
              s.holdSec > 0 && `${formatDuration(s.holdSec)} under tension`,
              s.volumeKg > 0 && `${formatVolume(s.volumeKg, data.settings.unit)} volume`,
              s.breakCount > 0 && `${formatDuration(s.totalBreakSec)} resting`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        <div className="card">
          <SessionDetail session={session} />
        </div>

        <div className="row wrap">
          <Link to="/exercises" className="btn primary grow">
            Done
          </Link>
          <Link to="/analytics" className="btn grow">
            View analytics
          </Link>
        </div>
      </div>
    </main>
  );
}
