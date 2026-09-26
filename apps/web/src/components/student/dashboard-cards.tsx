'use client';

import Link from 'next/link';
import { Icon } from '@/components/icon';
import type { DailyProblemDto } from '@/lib/api';

/** Daily problem card — green-tinted 24h challenge (SPEC §6.2). */
export function DailyProblemCard({
  daily,
  solved,
  solvedByTeammates,
  teammateCount,
  isHead,
}: {
  daily: DailyProblemDto | null;
  solved: boolean;
  solvedByTeammates?: number;
  teammateCount?: number;
  isHead?: boolean;
}) {
  if (!daily) {
    return (
      <section className="card-tint p-5">
        <div className="flex items-center gap-2">
          <span className="chip bg-a2sv-500 text-white">Daily problem</span>
          <span className="chip bg-white/70 text-slate-500">Refreshes every 24 hours</span>
        </div>
        <p className="mt-3 text-sm text-slate-500">No challenge assigned yet — check back tomorrow!</p>
      </section>
    );
  }
  return (
    <section className="card-tint p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-a2sv-500 text-white">Daily problem</span>
        <span className="chip bg-white/70 text-slate-500 capitalize">{daily.platform}</span>
        <span className="chip bg-white/70 text-slate-500 capitalize">{daily.difficulty}</span>
        {solved && !isHead && (
          <span className="chip bg-white/80 text-a2sv-700">
            <Icon name="check" className="mr-1 h-3.5 w-3.5" />
            Solved it
          </span>
        )}
        {isHead && solvedByTeammates !== undefined && (
          <span className="chip bg-white/80 text-a2sv-700">
            <Icon name="users" className="mr-1 h-3.5 w-3.5" />
            {solvedByTeammates} / {teammateCount} students solved this today
          </span>
        )}
      </div>
      <h3 className="mt-3 truncate text-lg font-bold text-slate-900">{daily.problemName}</h3>
      <p className="mt-1 text-xs text-slate-500">Refreshes every 24 hours and needs to be solved today!</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a href={daily.link} target="_blank" rel="noreferrer" className="btn-primary px-3 py-2 text-xs">
          Solve It Now <Icon name="chevronRight" className="ml-1 inline h-3.5 w-3.5" />
        </a>
        <Link href={`/problems/${daily.problemId}/submission`} className="btn-ghost px-3 py-2 text-xs">
          + New Solution
        </Link>
        {teammateCount != null && solvedByTeammates != null && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Icon name="users" className="h-4 w-4 text-a2sv-600" />
            {solvedByTeammates}/{teammateCount} teammates solved it
          </span>
        )}
      </div>
    </section>
  );
}

function Donut({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  const color = pct >= 80 ? '#0FA958' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="47" textAnchor="middle" className="fill-slate-900 text-[15px] font-bold">
        {pct}%
      </text>
      <text x="50" y="62" textAnchor="middle" className="fill-slate-400 text-[8px] font-medium uppercase tracking-widest">
        Completion
      </text>
    </svg>
  );
}

export interface CompletionRow {
  userId: string;
  name: string;
  solved: number;
  total: number;
  pct: number;
}

/** Team completion — group progress line + donut state + per-student breakdown (SPEC §6.2). */
export function TeamCompletionCard({
  rows,
  myId,
}: {
  rows: CompletionRow[];
  myId: string;
}) {
  const total = rows[0]?.total ?? 0;
  const avgPct = rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0;
  const solvedAvg = rows.length ? Math.round(rows.reduce((a, r) => a + r.solved, 0) / rows.length) : 0;
  const state = avgPct >= 80 ? { label: 'Good', color: 'bg-a2sv-500' } : avgPct >= 50 ? { label: 'Okay', color: 'bg-amber-400' } : { label: 'Bad', color: 'bg-red-500' };
  

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Team Completion</h3>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-a2sv-500" /> Good
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Okay
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Bad
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-5">
        <Donut pct={avgPct} />
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="text-slate-500">
              {total} exercises · <span className="font-semibold text-slate-800">{solvedAvg} solved (avg)</span>
            </span>
          </p>
          <p className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${state.color}`} />
            <span className="text-slate-500">
              State: <span className="font-semibold text-slate-800">{state.label}</span> ({avgPct}% completion)
            </span>
          </p>
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-a2sv-200" />
            <span className="text-slate-500">
              {total - solvedAvg >= 0 ? `${total - solvedAvg} available (avg)` : 'All caught up'}
            </span>
          </p>
        </div>
      </div>

    </section>
  );
}