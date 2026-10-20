import { useRef, useState } from 'react';
import { useAppStore } from '../store/AppStore';
import { THEMES } from '../lib/theme';
import { validateBundle } from '../lib/storage';
import { cues } from '../lib/audio';
import { wakeLockSupported } from '../lib/wakeLock';
import { formatClock } from '../lib/time';
import { EquipmentChips } from '../components/EquipmentBar';
import { Segmented, Stepper, Switch } from '../components/Controls';

async function saveJson(filename: string, json: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const file = new File([blob], filename, { type: 'application/json' });
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // On iOS (especially as a Home Screen app) the share sheet is the reliable way to save a file.
  if (isIOS && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'HomeBody backup' });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function SettingsPage() {
  const { data, updateSettings, exportAll, importAll, resetAll, saveError } = useAppStore();
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const doExport = async () => {
    try {
      const bundle = await exportAll();
      const date = new Date().toISOString().slice(0, 10);
      await saveJson(`homebody-backup-${date}.json`, JSON.stringify(bundle, null, 2));
      setMessage({ kind: 'ok', text: `Exported ${bundle.data.sessions.length} sessions.` });
    } catch (e) {
      setMessage({ kind: 'error', text: `Export failed: ${(e as Error).message}` });
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const bundle = validateBundle(JSON.parse(await file.text()));
      if (importMode === 'replace' && !confirm('Replace ALL current data (settings, history, draft) with this backup?')) return;
      const before = data.sessions.length;
      await importAll(bundle, importMode);
      const incoming = bundle.data.sessions?.length ?? 0;
      setMessage({
        kind: 'ok',
        text: importMode === 'replace' ? `Restored ${incoming} sessions from backup.` : `Merged backup · ${incoming} sessions in file, ${before} before.`,
      });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof SyntaxError ? 'That file is not valid JSON.' : (e as Error).message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reset = async () => {
    if (!confirm('Erase all HomeBody data on this device? Export a backup first if you want to keep it.')) return;
    if (!confirm('Really erase everything? This cannot be undone.')) return;
    await resetAll();
    setMessage({ kind: 'ok', text: 'All data erased.' });
  };

  return (
    <main className="main">
      <header className="page-header">
        <h1>Settings</h1>
      </header>

      <div className="stack-lg">
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Theme</h2>
          <div className="theme-cards">
            {THEMES.map((t) => (
              <button key={t.id} type="button" className="theme-card" aria-pressed={s.theme === t.id} onClick={() => updateSettings({ theme: t.id })}>
                <span className="swatches">
                  {t.swatches.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                <span>
                  <span style={{ fontWeight: 650, display: 'block' }}>{t.name}</span>
                  <span className="muted tiny">{t.tagline}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Equipment</h2>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Exercises show only when all their equipment is on. A mat is always assumed.
          </p>
          <EquipmentChips />
        </section>

        <section className="card">
          <h2 style={{ marginBottom: 4 }}>Workout</h2>
          <div className="setting-row">
            <span className="label">Default sets</span>
            <Stepper label="default sets" min={1} max={10} value={s.defaultSets} onChange={(v) => updateSettings({ defaultSets: v ?? 3 })} />
          </div>
          <div className="setting-row">
            <span>
              <span className="label">Automatic break timer</span>
              <span className="muted small" style={{ display: 'block' }}>
                Starts counting rest as soon as you finish a set
              </span>
            </span>
            <Switch label="Automatic break timer" checked={s.autoBreak} onChange={(v) => updateSettings({ autoBreak: v })} />
          </div>
          <div className="setting-row">
            <span>
              <span className="label">Target break</span>
              <span className="muted small" style={{ display: 'block' }}>
                {s.targetBreakSec != null ? `Gentle beep at ${formatClock(s.targetBreakSec * 1000)} · never forces you on` : 'Off'}
              </span>
            </span>
            <Switch label="Target break" checked={s.targetBreakSec != null} onChange={(v) => updateSettings({ targetBreakSec: v ? 90 : null })} />
          </div>
          {s.targetBreakSec != null && (
            <div className="setting-row">
              <span className="label">Target length (sec)</span>
              <Stepper label="target break seconds" min={10} max={900} step={15} value={s.targetBreakSec} onChange={(v) => updateSettings({ targetBreakSec: v ?? 90 })} />
            </div>
          )}
          <div className="setting-row">
            <span>
              <span className="label">Sound</span>
              <span className="muted small" style={{ display: 'block' }}>
                Short beeps for timer cues. On iPhone they follow the silent switch.
              </span>
            </span>
            <div className="row">
              <button type="button" className="btn small" disabled={!s.sound} onClick={() => cues.done()}>
                Test
              </button>
              <Switch label="Sound" checked={s.sound} onChange={(v) => updateSettings({ sound: v })} />
            </div>
          </div>
          <div className="setting-row">
            <span className="label">Weight units</span>
            <Segmented label="Weight units" value={s.unit} onChange={(unit) => updateSettings({ unit })} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
          </div>
        </section>

        <section className="card stack">
          <div>
            <h2>Your data</h2>
            <p className="muted small">
              Stored only on this device ({data.sessions.length} sessions). Export a backup to move it between your phone and computer.
            </p>
          </div>
          {saveError && <div className="notice error">Couldn't save: {saveError}. Export a backup to be safe.</div>}
          {message && <div className={`notice${message.kind === 'error' ? ' error' : ''}`}>{message.text}</div>}
          <button type="button" className="btn primary block" onClick={doExport}>
            Export all data (JSON)
          </button>
          <div className="divider" />
          <div className="stack" style={{ gap: 8 }}>
            <span className="field-label">Import mode</span>
            <Segmented
              full
              label="Import mode"
              value={importMode}
              onChange={setImportMode}
              options={[
                { value: 'merge', label: 'Merge history' },
                { value: 'replace', label: 'Replace everything' },
              ]}
            />
            <p className="tiny muted">
              {importMode === 'merge'
                ? 'Adds sessions from the file that are not already here. Keeps your current settings.'
                : 'Overwrites all data on this device with the backup.'}
            </p>
            <button type="button" className="btn block" onClick={() => fileRef.current?.click()}>
              Import from file…
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <div className="divider" />
          <button type="button" className="btn danger block" onClick={reset}>
            Reset all data
          </button>
        </section>

        <p className="tiny muted" style={{ textAlign: 'center' }}>
          HomeBody v1 · Keep-awake {wakeLockSupported() ? 'supported' : 'not supported on this browser'}
        </p>
      </div>
    </main>
  );
}
