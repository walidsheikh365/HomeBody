import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { EXERCISES } from '../data/exercises';
import { BODY_PARTS, EQUIPMENT } from '../data/meta';
import { byPopularity } from '../data/popularity';
import { isAvailable, matchesSearch } from '../lib/filter';
import { useAppStore } from '../store/AppStore';
import type { Exercise } from '../types';
import { EquipmentBar } from '../components/EquipmentBar';
import { ExerciseRow } from '../components/ExerciseRow';
import { SessionTray } from '../components/SessionTray';
import { EmptyState, Segmented } from '../components/Controls';
import { IconChevron, IconDumbbell, IconSearch, IconX } from '../components/Icons';

/** Exercises shown when a section is first opened; the rest sit behind "Show more". */
const PREVIEW_COUNT = 7;

interface Group {
  id: string;
  label: string;
  items: Exercise[];
}

export default function ExercisesPage() {
  const { data, updateSettings, isPlanned, canRemovePlanned, togglePlanned } = useAppStore();
  const { equipment, browseMode } = data.settings;
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});

  const groups: Group[] = useMemo(() => {
    const visible = byPopularity(EXERCISES).filter((e) => isAvailable(e, equipment) && matchesSearch(e, deferredQuery));
    const list =
      browseMode === 'bodyPart'
        ? BODY_PARTS.map((b) => ({ id: b.id, label: b.label, items: visible.filter((e) => e.bodyPart === b.id) }))
        : EQUIPMENT.map((q) => ({ id: q.id, label: q.label, items: visible.filter((e) => e.equipment.includes(q.id)) }));
    return list.filter((g) => g.items.length > 0);
  }, [equipment, browseMode, deferredQuery]);

  const searching = deferredQuery.trim().length > 0;
  const total = useMemo(() => new Set(groups.flatMap((g) => g.items.map((e) => e.id))).size, [groups]);
  const toggle = useCallback((id: string) => togglePlanned(id), [togglePlanned]);
  const noEquipment = !Object.values(equipment).some(Boolean);

  return (
    <main className="main with-tray">
      <header className="page-header">
        <div>
          <h1>Exercises</h1>
          <p className="muted small">
            {total} available{data.active ? ' · adding to your running session' : ''}
          </p>
        </div>
      </header>

      <div className="toolbar">
        <div className="search">
          <IconSearch />
          <input
            className="input"
            type="search"
            placeholder="Search exercises, muscles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search exercises"
            enterKeyHint="search"
          />
          {query && (
            <button type="button" className="icon-btn plain clear" aria-label="Clear search" onClick={() => setQuery('')}>
              <IconX />
            </button>
          )}
        </div>
        <EquipmentBar />
        <Segmented
          full
          label="Browse by"
          value={browseMode}
          onChange={(v) => updateSettings({ browseMode: v })}
          options={[
            { value: 'bodyPart', label: 'By body part' },
            { value: 'equipment', label: 'By equipment' },
          ]}
        />
      </div>

      {groups.length === 0 && (
        <EmptyState icon={<IconDumbbell />} title={noEquipment ? 'No equipment selected' : 'Nothing matches'}>
          {noEquipment
            ? 'Turn on at least one item in the Equipment bar above (Bodyweight is a good start).'
            : 'Try a different search, or switch on more equipment.'}
        </EmptyState>
      )}

      {groups.map((g) => {
        const key = `${browseMode}:${g.id}`;
        const open = searching || !collapsed[key];
        const full = searching || showAll[key];
        const shown = full ? g.items : g.items.slice(0, PREVIEW_COUNT);
        const hidden = g.items.length - shown.length;
        return (
          <section key={key} className="section">
            <button
              type="button"
              className="section-head"
              aria-expanded={open}
              onClick={() => {
                setCollapsed((c) => ({ ...c, [key]: !c[key] }));
                // Re-opening a section starts from the short list again.
                setShowAll((s) => ({ ...s, [key]: false }));
              }}
            >
              <IconChevron className={`chev${open ? ' open' : ''}`} />
              <h2>{g.label}</h2>
              <span className="count num" aria-label={`${g.items.length} exercises`}>
                {g.items.length}
              </span>
            </button>
            {open && (
              <>
                <ul className="ex-list fade-in">
                  {shown.map((ex) => {
                    const added = isPlanned(ex.id);
                    return (
                      <ExerciseRow
                        key={ex.id}
                        ex={ex}
                        added={added}
                        removable={!added || canRemovePlanned(ex.id)}
                        onToggle={toggle}
                        showBodyPart={browseMode === 'equipment'}
                      />
                    );
                  })}
                </ul>
                {hidden > 0 && (
                  <button
                    type="button"
                    className="btn soft block show-more"
                    onClick={() => setShowAll((s) => ({ ...s, [key]: true }))}
                  >
                    Show {hidden} more
                    <IconChevron className="chev open" />
                  </button>
                )}
              </>
            )}
          </section>
        );
      })}

      <SessionTray />
    </main>
  );
}
