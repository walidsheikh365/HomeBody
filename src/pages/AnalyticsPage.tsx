import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from '../store/AppStore';
import { bodyPartBreakdown, breakTrend, dailyLog, heatmap, sessionsPerWeek, streaks, topExercises, totals, type DayLog, type Range } from '../lib/stats';
import { useThemeColors, type ThemeColors } from '../lib/useThemeColors';
import { useMediaQuery } from '../lib/useMediaQuery';
import { dayKey, formatDayLabel, formatDuration, formatTimeOfDay } from '../lib/time';
import { formatVolume } from '../lib/units';
import { SessionDetail } from '../components/SessionDetail';
import { PoseIcon } from '../components/PoseIcon';
import { EXERCISE_BY_ID } from '../data/exercises';
import { EmptyState, Segmented } from '../components/Controls';
import { IconChart, IconChevron, IconTrash } from '../components/Icons';
import type { SessionRecord } from '../types';

function tooltipProps(c: ThemeColors) {
  return {
    contentStyle: {
      background: c.surface,
      border: `1px solid ${c.border}`,
      borderRadius: 12,
      color: c.text,
      fontSize: 13,
      boxShadow: '0 12px 30px -14px rgba(0,0,0,0.45)',
    },
    labelStyle: { color: c.muted, marginBottom: 2 },
    itemStyle: { color: c.text, padding: 0 },
    cursor: { fill: c.border, opacity: 0.35 },
  };
}

export default function AnalyticsPage() {
  const { data } = useAppStore();
  const sessions = data.sessions;
  const desktop = useMediaQuery('(min-width: 900px)');
  const colors = useThemeColors();

  if (sessions.length === 0) {
    return (
      <main className="main wide">
        <header className="page-header">
          <h1>Analytics</h1>
        </header>
        <div className="card">
          <EmptyState
            icon={<IconChart />}
            title="Nothing to chart yet"
            action={
              <Link to="/exercises" className="btn primary">
                Plan a session
              </Link>
            }
          >
            Finish your first session and your streaks, sets per body part, break times and daily log will show up here.
          </EmptyState>
        </div>
      </main>
    );
  }

  return (
    <main className="main wide">
      <header className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="muted small">Everything is recorded automatically from your sessions.</p>
        </div>
      </header>
      <div className="analytics-grid">
        <Overview sessions={sessions} />
        <div className="card span-2">
          <ActivityCalendar sessions={sessions} weeks={desktop ? 26 : 18} />
        </div>
        <div className="card">
          <WeeklyChart sessions={sessions} colors={colors} />
        </div>
        <div className="card">
          <BodyParts sessions={sessions} colors={colors} />
        </div>
        <div className="card">
          <BreakTrends sessions={sessions} colors={colors} />
        </div>
        <div className="card">
          <TopExercises sessions={sessions} />
        </div>
        <div className="span-2">
          <DailyLog sessions={sessions} desktop={desktop} />
        </div>
      </div>
    </main>
  );
}

function Overview({ sessions }: { sessions: SessionRecord[] }) {
  const st = streaks(sessions);
  const t = totals(sessions);
  return (
    <div className="stat-grid span-2">
      <div className="stat">
        <div className="value">{st.current}</div>
        <div className="label">Day streak · best {st.longest}</div>
      </div>
      <div className="stat">
        <div className="value">{t.sessions}</div>
        <div className="label">Sessions · {st.activeDays} active days</div>
      </div>
      <div className="stat">
        <div className="value">{t.sets}</div>
        <div className="label">Sets completed</div>
      </div>
      <div className="stat">
        <div className="value">{t.avgBreakSec != null ? formatDuration(t.avgBreakSec) : '—'}</div>
        <div className="label">Average break</div>
      </div>
    </div>
  );
}

function ActivityCalendar({ sessions, weeks }: { sessions: SessionRecord[]; weeks: number }) {
  const cols = useMemo(() => heatmap(sessions, weeks), [sessions, weeks]);
  const today = dayKey(Date.now());
  const level = (sets: number) => (sets === 0 ? '' : sets < 8 ? ' l1' : sets < 16 ? ' l2' : ' l3');
  return (
    <>
      <div className="card-head">
        <div>
          <h2>Active days</h2>
          <p className="muted small">Last {weeks} weeks · darker = more sets</p>
        </div>
      </div>
      <div className="heatmap" role="img" aria-label="Calendar of active days">
        {[...cols].reverse().map((col) => (
          <div className="col" key={col[0].key}>
            {col.map((c) => (
              <div
                key={c.key}
                className={`cell${level(c.sets)}${c.future ? ' future' : ''}${c.key === today ? ' today' : ''}`}
                title={`${formatDayLabel(c.key)} · ${c.sessions ? `${c.sets} sets` : 'rest day'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function WeeklyChart({ sessions, colors }: { sessions: SessionRecord[]; colors: ThemeColors }) {
  const rows = useMemo(() => sessionsPerWeek(sessions, 12), [sessions]);
  return (
    <>
      <div className="card-head">
        <div>
          <h2>Sessions per week</h2>
          <p className="muted small">Last 12 weeks</p>
        </div>
      </div>
      <div className="chart-box">
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="weekFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.chart[0]} stopOpacity={0.95} />
                <stop offset="100%" stopColor={colors.chart[0]} stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={colors.border} strokeDasharray="3 4" />
            <XAxis dataKey="label" tick={{ fill: colors.muted, fontSize: 12 }} tickLine={false} axisLine={{ stroke: colors.border }} interval="preserveStartEnd" minTickGap={16} />
            <YAxis allowDecimals={false} tick={{ fill: colors.muted, fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip {...tooltipProps(colors)} formatter={(v) => [v, 'Sessions']} />
            <Bar dataKey="sessions" fill="url(#weekFill)" radius={[8, 8, 2, 2]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function BodyParts({ sessions, colors }: { sessions: SessionRecord[]; colors: ThemeColors }) {
  const { data } = useAppStore();
  const [range, setRange] = useState<Range>('7d');
  const [view, setView] = useState<'donut' | 'bars'>('donut');
  const rows = useMemo(() => bodyPartBreakdown(sessions, range), [sessions, range]);
  const withColor = rows.map((r, i) => ({ ...r, color: colors.chart[i % colors.chart.length] }));
  const active = withColor.filter((r) => r.sets > 0);
  const totalSets = active.reduce((a, r) => a + r.sets, 0);

  return (
    <>
      <div className="card-head">
        <h2>Sets per body part</h2>
        <Segmented label="Chart type" value={view} onChange={setView} options={[{ value: 'donut', label: 'Donut' }, { value: 'bars', label: 'Bars' }]} />
      </div>
      <Segmented
        full
        label="Time range"
        value={range}
        onChange={setRange}
        options={[
          { value: 'today', label: 'Today' },
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' },
          { value: 'all', label: 'All' },
        ]}
      />
      {totalSets === 0 ? (
        <EmptyState icon={<IconChart />} title="No sets in this range">
          Try a longer range.
        </EmptyState>
      ) : (
        <>
          <div className="chart-box" style={{ marginTop: 8 }}>
            <ResponsiveContainer>
              {view === 'donut' ? (
                <PieChart>
                  <Pie data={active} dataKey="sets" nameKey="label" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none" cornerRadius={6}>
                    {active.map((r) => (
                      <Cell key={r.bodyPart} fill={r.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipProps(colors)} formatter={(v, n) => [`${v} sets`, n]} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill={colors.text} style={{ fontSize: 28, fontWeight: 650 }}>
                    {totalSets}
                  </text>
                </PieChart>
              ) : (
                <BarChart data={withColor} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fill: colors.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={118} tick={{ fill: colors.text, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipProps(colors)} formatter={(v) => [`${v} sets`, 'Sets']} />
                  <Bar dataKey="sets" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {withColor.map((r) => (
                      <Cell key={r.bodyPart} fill={r.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="legend">
            {active.map((r) => (
              <span key={r.bodyPart}>
                <i style={{ background: r.color }} />
                {r.label} · <span className="num">{r.sets}</span>
                {r.volumeKg > 0 && <span className="muted"> · {formatVolume(r.volumeKg, data.settings.unit)}</span>}
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function BreakTrends({ sessions, colors }: { sessions: SessionRecord[]; colors: ThemeColors }) {
  const rows = useMemo(() => breakTrend(sessions, 30), [sessions]);
  return (
    <>
      <div className="card-head">
        <div>
          <h2>Break times</h2>
          <p className="muted small">Per session · bars = total rest, line = average break</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<IconChart />} title="No breaks recorded yet">
          Breaks are timed between sets during a guided session.
        </EmptyState>
      ) : (
        <div className="chart-box">
          <ResponsiveContainer>
            <ComposedChart data={rows} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="restFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.chart[1]} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={colors.chart[1]} stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={colors.border} strokeDasharray="3 4" />
              <XAxis dataKey="label" tick={{ fill: colors.muted, fontSize: 12 }} tickLine={false} axisLine={{ stroke: colors.border }} minTickGap={16} />
              <YAxis yAxisId="min" tick={{ fill: colors.muted, fontSize: 12 }} tickLine={false} axisLine={false} unit="m" />
              <YAxis yAxisId="sec" orientation="right" tick={{ fill: colors.muted, fontSize: 12 }} tickLine={false} axisLine={false} unit="s" width={44} />
              <Tooltip
                {...tooltipProps(colors)}
                formatter={(v, name) => (name === 'totalMin' ? [`${v} min`, 'Total rest'] : [formatDuration(Number(v)), 'Average break'])}
              />
              <Bar yAxisId="min" dataKey="totalMin" fill="url(#restFill)" radius={[8, 8, 2, 2]} maxBarSize={28} />
              <Line yAxisId="sec" type="monotone" dataKey="avgSec" stroke={colors.chart[0]} strokeWidth={2.5} dot={{ r: 3, fill: colors.chart[0], strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

function TopExercises({ sessions }: { sessions: SessionRecord[] }) {
  const rows = useMemo(() => topExercises(sessions, 8), [sessions]);
  const max = rows[0]?.sets ?? 1;
  return (
    <>
      <div className="card-head">
        <div>
          <h2>Most-done exercises</h2>
          <p className="muted small">By completed sets, all time</p>
        </div>
      </div>
      <div className="bar-list">
        {rows.map((r) => (
          <div key={r.exerciseId} className="bar-row">
            <span className="row" style={{ gap: 8, minWidth: 0 }}>
              {EXERCISE_BY_ID[r.exerciseId] && (
                <span className="pose-tile small" aria-hidden="true">
                  <PoseIcon ex={EXERCISE_BY_ID[r.exerciseId]} size={28} />
                </span>
              )}
              <span style={{ fontWeight: 560, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
            </span>
            <span className="muted small num">
              {r.sets} sets · {r.sessions}×
            </span>
            <div className="track">
              <div className="fill" style={{ width: `${(r.sets / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function DayDetail({ day }: { day: DayLog }) {
  const { deleteSession } = useAppStore();
  return (
    <div className="detail fade-in">
      {day.sessions.map((s) => (
        <div key={s.id} className="stack">
          <div className="row-between">
            <span className="small muted">
              {formatTimeOfDay(s.startedAt)}–{formatTimeOfDay(s.endedAt)} · {formatDuration(s.durationSec)}
            </span>
            <button
              type="button"
              className="icon-btn plain"
              aria-label="Delete session"
              onClick={() => {
                if (confirm('Delete this session from your history? This cannot be undone.')) deleteSession(s.id);
              }}
            >
              <IconTrash />
            </button>
          </div>
          <SessionDetail session={s} />
        </div>
      ))}
    </div>
  );
}

function DailyLog({ sessions, desktop }: { sessions: SessionRecord[]; desktop: boolean }) {
  const { data } = useAppStore();
  const unit = data.settings.unit;
  const days = useMemo(() => dailyLog(sessions), [sessions]);
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));

  return (
    <section>
      <div className="card-head" style={{ marginTop: 8 }}>
        <h2>Daily log</h2>
        <span className="muted small">Tap a day for full details</span>
      </div>
      {desktop ? (
        <div className="card dense" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="log-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Sessions</th>
                <th>Time</th>
                <th>Exercises</th>
                <th>Sets</th>
                <th>Reps</th>
                <th>Hold time</th>
                <th>Volume</th>
                <th>Avg break</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <DayTableRows key={d.key} day={d} open={open === d.key} onToggle={() => toggle(d.key)} unit={unit} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        days.map((d) => (
          <div key={d.key} className="day">
            <button type="button" aria-expanded={open === d.key} onClick={() => toggle(d.key)}>
              <IconChevron className={`chev${open === d.key ? ' open' : ''}`} />
              <span className="grow">
                <span style={{ fontWeight: 620, display: 'block' }}>{formatDayLabel(d.key)}</span>
                <span className="muted small num">
                  {d.exercises} exercises · {d.sets} sets · {formatDuration(d.durationSec)}
                  {d.avgBreakSec != null ? ` · ${formatDuration(d.avgBreakSec)} avg break` : ''}
                </span>
              </span>
            </button>
            {open === d.key && <DayDetail day={d} />}
          </div>
        ))
      )}
    </section>
  );
}

function DayTableRows({ day, open, onToggle, unit }: { day: DayLog; open: boolean; onToggle: () => void; unit: 'kg' | 'lb' }) {
  return (
    <>
      <tr
        className={`clickable${open ? ' expanded' : ''}`}
        onClick={onToggle}
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          <IconChevron className={`chev${open ? ' open' : ''}`} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {formatDayLabel(day.key)}
        </td>
        <td>{day.sessions.length}</td>
        <td>{formatDuration(day.durationSec)}</td>
        <td>{day.exercises}</td>
        <td>{day.sets}</td>
        <td>{day.reps || '—'}</td>
        <td>{day.holdSec ? formatDuration(day.holdSec) : '—'}</td>
        <td>{day.volumeKg ? formatVolume(day.volumeKg, unit) : '—'}</td>
        <td>{day.avgBreakSec != null ? formatDuration(day.avgBreakSec) : '—'}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={9} style={{ padding: 0 }}>
            <div style={{ maxWidth: 720, paddingTop: 12 }}>
              <DayDetail day={day} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
