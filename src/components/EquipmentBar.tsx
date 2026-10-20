import { useState } from 'react';
import { EQUIPMENT } from '../data/meta';
import { useAppStore } from '../store/AppStore';
import { IconCheck, IconChevron, IconDumbbell } from './Icons';

export function EquipmentChips() {
  const { data, toggleEquipment } = useAppStore();
  return (
    <div className="chips">
      {EQUIPMENT.map((e) => {
        const on = data.settings.equipment[e.id];
        return (
          <button key={e.id} type="button" className="chip" aria-pressed={on} onClick={() => toggleEquipment(e.id)}>
            <span className="check">{on && <IconCheck />}</span>
            {e.label}
          </button>
        );
      })}
    </div>
  );
}

export function EquipmentBar() {
  const { data } = useAppStore();
  const [open, setOpen] = useState(false);
  const on = EQUIPMENT.filter((e) => data.settings.equipment[e.id]);
  const summary = on.length === EQUIPMENT.length ? 'All equipment' : on.length === 0 ? 'No equipment selected' : on.map((e) => e.label).join(' · ');
  return (
    <div className="equip-bar">
      <button type="button" className="summary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <IconDumbbell width={20} height={20} style={{ color: 'var(--accent-text)', flex: '0 0 20px' }} />
        <span className="grow">
          <span style={{ fontWeight: 600 }}>Equipment</span>
          <span className="muted small" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {summary}
          </span>
        </span>
        <IconChevron className={`chev${open ? ' open' : ''}`} />
      </button>
      {open && (
        <div className="fade-in">
          <EquipmentChips />
        </div>
      )}
    </div>
  );
}
