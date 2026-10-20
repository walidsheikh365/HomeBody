import { useNavigate } from 'react-router';
import { useAppStore } from '../store/AppStore';
import { IconChevron } from './Icons';

export function SessionTray() {
  const { data } = useAppStore();
  const navigate = useNavigate();
  const active = data.active;
  const count = active ? active.items.length : data.draft.items.length;
  if (!active && count === 0) return null;
  return (
    <button type="button" className="tray" onClick={() => navigate('/session')} style={{ textAlign: 'left' }}>
      <span className="badge num">{count}</span>
      <span className="grow">
        <span style={{ fontWeight: 650, display: 'block' }}>{active ? 'Session in progress' : `${count === 1 ? 'exercise' : 'exercises'} in session`}</span>
        <span className="muted small">{active ? 'Tap to resume' : 'Tap to review and start'}</span>
      </span>
      <span className="btn primary small" aria-hidden>
        {active ? 'Resume' : 'Open'}
        <IconChevron />
      </span>
    </button>
  );
}
