'use client';

import Link from 'next/link';
import { Icon } from '@/components/icon';
import { timeAgo } from '@/lib/format';
import type { SubmissionDto } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** Recently solved — thin full-width rows, each with the solver's avatar + the problem title (SPEC §6.2). */
export function RecentSolvesList({ submissions }: { submissions: SubmissionDto[] }) {
  if (submissions.length === 0) {
    return (
      <section className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700">Recently solved</h3>
        <p className="mt-3 text-sm text-slate-400">No solves yet — be the first to log a solution!</p>
      </section>
    );
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Recently solved</h3>
        <span className="text-xs text-slate-400">{submissions.length} latest</span>
      </div>
      <ul className="mt-3 space-y-2">
        {submissions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl bg-slate-50/70 px-3 py-2.5 transition hover:bg-a2sv-50/40">
            <div className="min-w-0 flex-1">
              <Link href={`/problems/${s.problemId}/submission`} className="block truncate text-sm font-semibold text-slate-800 hover:text-a2sv-700">
                {s.problemName ?? 'Problem'}
              </Link>
              <p className="truncate text-xs text-slate-400">
                solved by <span className="font-medium text-slate-500">{s.userName ?? 'Student'}</span>
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
              <Icon name="check" className="h-3.5 w-3.5 text-a2sv-600" />
              {timeAgo(s.createdAt)}
            </span>
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-a2sv-100 text-xs font-bold text-a2sv-700">
              {s.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.avatarUrl} alt={s.userName ?? ''} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                initials(s.userName ?? '?')
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}