'use client';

import { useState } from 'react';
import type { Group } from '@/lib/api';

interface ComparisonGroup {
  groupId: string;
  name: string;
  rank: number;
  metrics: Record<string, number>;
}
interface ComparisonResult {
  mode: string;
  range: string;
  groups: ComparisonGroup[];
}

const MODES = [
  { key: 'summary', label: 'Summary' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'completion', label: 'Completion' },
  { key: 'contest', label: 'Contest' },
] as const;

const COLUMNS: Record<string, { key: string; label: string }[]> = {
  summary: [
    { key: 'studentCount', label: 'Students' },
    { key: 'submissions', label: 'Solves' },
    { key: 'timeSpentMin', label: 'Time (min)' },
    { key: 'presentPct', label: 'Att. %' },
    { key: 'avgCompletion', label: 'Comp. %' },
    { key: 'conversionPct', label: 'Cont. %' },
  ],
  attendance: [
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'excused', label: 'Excused' },
    { key: 'late', label: 'Late' },
    { key: 'attTotal', label: 'Total' },
    { key: 'presentPct', label: '%' },
  ],
  consistency: [
    { key: 'activeDays', label: 'Active days' },
    { key: 'submissions', label: 'Solves' },
    { key: 'timeSpentMin', label: 'Time (min)' },
  ],
  completion: [
    { key: 'trackTotal', label: 'Problems' },
    { key: 'avgCompletion', label: 'Avg %' },
    { key: 'minCompletion', label: 'Min %' },
    { key: 'maxCompletion', label: 'Max %' },
    { key: 'completedAll', label: 'Done all' },
  ],
  contest: [
    { key: 'contestTotal', label: 'Problems' },
    { key: 'contestSolved', label: 'Solved' },
    { key: 'conversionPct', label: 'Conv. %' },
  ],
};

const PRIMARY: Record<string, string> = {
  summary: 'submissions',
  attendance: 'presentPct',
  consistency: 'activeDays',
  completion: 'avgCompletion',
  contest: 'conversionPct',
};

const TROPHY = ['🥇', '🥈', '🥉'];

/** Group Comparison — multi-select groups, mode tabs, range, Table/Graph (SPEC §7.11/§8.10). */
export function GroupComparison({ groups }: { groups: Group[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<string>('summary');
  const [range, setRange] = useState<string>('all');
  const [output, setOutput] = useState<'table' | 'graph'>('table');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function compare() {
    if (selected.length === 0) {
      setError('Select at least one group.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds: selected, mode, range, output }),
      });
      const payload = (await res.json().catch(() => null)) as ComparisonResult | { error?: { message: string } } | null;
      if (!res.ok) {
        setError((payload as { error?: { message: string } })?.error?.message ?? 'Could not compare groups.');
        return;
      }
      setResult(payload as ComparisonResult);
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  const columns = COLUMNS[mode] ?? COLUMNS.summary;
  const primary = PRIMARY[mode] ?? 'submissions';
  const maxVal = result ? Math.max(1, ...result.groups.map((g) => g.metrics[primary] ?? 0)) : 1;

  return (
    <section className="card p-6">
      <h2 className="text-sm font-bold text-slate-900">Group Comparison</h2>
      <p className="mt-1 text-xs text-slate-400">Rank groups across a mode, over a chosen window.</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={`chip px-3 py-1.5 text-sm transition ${mode === m.key ? 'bg-a2sv-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => {
            const active = selected.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggle(g.id)}
                className={`chip px-3 py-1.5 text-sm transition ${active ? 'bg-a2sv-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {g.name}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {(['week', 'all'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`chip px-3 py-1.5 text-sm capitalize transition ${range === r ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {r === 'week' ? 'Past week' : 'All time'}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['table', 'graph'] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutput(o)}
                className={`chip px-3 py-1.5 text-sm capitalize transition ${output === o ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {o}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => void compare()} disabled={busy}>
            {busy ? 'Comparing…' : 'Compare'}
          </button>
        </div>

        {error && <p className="field-error">{error}</p>}
      </div>

      {result && (
        <div className="mt-5">
          {output === 'graph' ? (
            <div className="space-y-3">
              {result.groups.map((g) => (
                <div key={g.groupId} className="flex items-center gap-3">
                  <span className="w-6 text-lg">{TROPHY[g.rank - 1] ?? ''}</span>
                  <span className="w-28 truncate text-sm font-semibold text-slate-800">{g.name}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
                    <div
                      className="h-full rounded-md bg-a2sv-500 transition-all"
                      style={{ width: `${Math.round(((g.metrics[primary] ?? 0) / maxVal) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-bold text-slate-900">{g.metrics[primary] ?? 0}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Group</th>
                    {columns.map((c) => (
                      <th key={c.key} className="px-3 py-3 font-semibold">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.groups.map((g) => (
                    <tr key={g.groupId}>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        {TROPHY[g.rank - 1] ?? ''} {g.name}
                      </td>
                      {columns.map((c) => (
                        <td key={c.key} className={`px-3 py-2.5 ${c.key === primary ? 'font-bold text-a2sv-700' : 'text-slate-700'}`}>
                          {g.metrics[c.key] ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

