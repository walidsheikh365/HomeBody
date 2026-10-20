import { EXERCISE_BY_ID } from '../data/exercises';
import { useAppStore } from '../store/AppStore';
import type { SessionRecord } from '../types';
import { formatClock, formatDuration } from '../lib/time';
import { formatWeight } from '../lib/units';
import { PoseIcon } from './PoseIcon';

/** Per-exercise breakdown of a finished session: every set and the break that followed it. */
export function SessionDetail({ session }: { session: SessionRecord }) {
  const { data } = useAppStore();
  const unit = data.settings.unit;
  const groups = new Map<number, SessionRecord['sets']>();
  for (const s of session.sets) groups.set(s.itemIndex, [...(groups.get(s.itemIndex) ?? []), s]);
  const ordered = [...groups.entries()].sort((a, b) => a[0] - b[0]);

  if (ordered.length === 0) return <p className="muted small">No sets were recorded.</p>;

  return (
    <div className="stack">
      {ordered.map(([itemIndex, sets]) => {
        const first = sets[0];
        const ex = EXERCISE_BY_ID[first.exerciseId];
        const name = ex?.name ?? first.exerciseName;
        return (
          <div key={itemIndex}>
            <div className="row" style={{ marginBottom: 4, gap: 8 }}>
              {ex && (
                <span className="pose-tile small" aria-hidden="true">
                  <PoseIcon ex={ex} size={32} />
                </span>
              )}
              <h3>{name}</h3>
            </div>
            <table className="set-table">
              <thead>
                <tr>
                  <th>Set</th>
                  <th>Result</th>
                  <th>Rest after</th>
                </tr>
              </thead>
              <tbody>
                {[...sets]
                  .sort((a, b) => a.setIndex - b.setIndex)
                  .map((s) => {
                    const br = session.breaks.find((b) => b.itemIndex === s.itemIndex && b.setIndex === s.setIndex);
                    let result: string;
                    if (s.status === 'skipped') result = 'Skipped';
                    else if (s.kind === 'timed' || (s.durationSec != null && s.reps == null)) {
                      result = s.durationSec != null ? formatClock(s.durationSec * 1000) : 'Done';
                      if (s.weightKg) result += ` · ${formatWeight(s.weightKg, unit)}`;
                    } else {
                      result = s.reps != null ? `${s.reps} reps` : 'Done';
                      if (s.weightKg) result += ` × ${formatWeight(s.weightKg, unit)}`;
                    }
                    return (
                      <tr key={s.id}>
                        <td>{s.setIndex + 1}</td>
                        <td className={s.status === 'skipped' ? 'muted' : undefined}>{result}</td>
                        <td className="muted">{br ? formatDuration(br.durationSec) : '—'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
