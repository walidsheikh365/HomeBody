import { useEffect, useState, type ReactNode } from 'react';
import { IconMinus, IconPlus } from './Icons';

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  full,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  full?: boolean;
  label: string;
}) {
  return (
    <div className={`segmented${full ? ' full' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Number input with large −/+ buttons. `value` may be undefined for optional
 * fields; stepping below `min` on an optional field clears it.
 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  optional = false,
  placeholder = '—',
  label,
  big,
  decimal,
  start,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  optional?: boolean;
  placeholder?: string;
  label: string;
  big?: boolean;
  decimal?: boolean;
  /** Value used when + is pressed on an empty field. */
  start?: number;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    setText(value == null ? '' : String(value));
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  const dec = () => {
    if (value == null) return;
    const n = value - step;
    if (n < min) onChange(optional ? undefined : min);
    else onChange(clamp(n));
  };
  const inc = () => onChange(clamp(value == null ? (start ?? Math.max(min, step)) : value + step));
  const commit = (raw: string) => {
    const t = raw.replace(',', '.').trim();
    if (t === '') {
      onChange(optional ? undefined : min);
      return;
    }
    const n = Number(t);
    if (Number.isFinite(n)) onChange(clamp(n));
    else setText(value == null ? '' : String(value));
  };

  return (
    <div className={`stepper${big ? ' big' : ''}`}>
      <button type="button" className="icon-btn" aria-label={`Decrease ${label}`} onClick={dec} disabled={value == null || (!optional && value <= min)}>
        <IconMinus />
      </button>
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        aria-label={label}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      <button type="button" className="icon-btn" aria-label={`Increase ${label}`} onClick={inc} disabled={value != null && value >= max}>
        <IconPlus />
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty fade-in">
      <div className="art">{icon}</div>
      <h3>{title}</h3>
      {children && <p className="small">{children}</p>}
      {action}
    </div>
  );
}
