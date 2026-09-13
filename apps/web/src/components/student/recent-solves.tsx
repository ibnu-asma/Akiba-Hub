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

function formatLanguage(lang?: string | null): { name: string; style: string } {
  const l = (lang || '').toLowerCase().trim();
  switch (l) {
    case 'python':
    case 'python3':
    case 'py':
      return { name: 'Python', style: 'bg-blue-50 text-blue-700 border-blue-200/70' };
    case 'cpp':
    case 'c++':
      return { name: 'C++', style: 'bg-indigo-50 text-indigo-700 border-indigo-200/70' };
    case 'javascript':
    case 'js':
      return { name: 'JavaScript', style: 'bg-amber-50 text-amber-800 border-amber-200/70' };
    case 'typescript':
    case 'ts':
      return { name: 'TypeScript', style: 'bg-sky-50 text-sky-700 border-sky-200/70' };
    case 'java':
      return { name: 'Java', style: 'bg-rose-50 text-rose-700 border-rose-200/70' };
    case 'go':
    case 'golang':
      return { name: 'Go', style: 'bg-cyan-50 text-cyan-700 border-cyan-200/70' };
    case 'rust':
      return { name: 'Rust', style: 'bg-orange-50 text-orange-700 border-orange-200/70' };
    default:
      return {
        name: lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : 'Code',
        style: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

/** Recently solved — redesigned modern feed with solver avatars, language tags, time/tries, and problem links (SPEC §6.2). */
export function RecentSolvesList({ submissions }: { submissions: SubmissionDto[] }) {
  if (submissions.length === 0) {
    return (
      <section className="card p-8 text-center rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-a2sv-50 text-a2sv-600 border border-a2sv-100/80">
          <Icon name="code" className="h-6 w-6" />
        </div>
        <h3 className="mt-3.5 text-base font-bold text-slate-800">Recently solved</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
          No solves yet — be the first in your group to log a solution and claim the top spot!
        </p>
        <div className="mt-4">
          <Link
            href="/problems"
            className="inline-flex items-center gap-2 rounded-xl bg-a2sv-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-a2sv-700 transition"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Browse Problems
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Icon name="check" className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-none">Recently solved</h3>
            <p className="mt-1 text-xs text-slate-400">Live submissions from your cohort</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {submissions.length} {submissions.length === 1 ? 'solution' : 'solutions'}
          </span>
          <Link
            href="/problems"
            className="text-xs font-medium text-a2sv-600 hover:text-a2sv-700 transition"
          >
            All problems →
          </Link>
        </div>
      </div>

      <ul className="divide-y divide-slate-100/80">
        {submissions.map((s) => {
          const lang = formatLanguage(s.language);
          const solverName = s.userName || 'Scholar';

          return (
            <li
              key={s.id}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 px-3 rounded-xl transition-colors hover:bg-slate-50/80"
            >
              {/* Left: Avatar + Details */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Avatar with gradient fallback */}
                <div className="relative shrink-0">
                  <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-slate-200/80 bg-gradient-to-tr from-a2sv-600 to-indigo-600 text-xs font-bold text-white shadow-2xs">
                    {s.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatarUrl} alt={solverName} className="h-full w-full object-cover" />
                    ) : (
                      initials(solverName)
                    )}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                    title="Verified solver"
                  />
                </div>

                {/* Problem title + tags + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/problems/${s.problemId}`}
                      className="font-bold text-sm text-slate-900 hover:text-a2sv-600 transition truncate max-w-md"
                      title={s.problemName ?? 'Problem'}
                    >
                      {s.problemName ?? 'Problem'}
                    </Link>

                    {/* Language tag */}
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${lang.style}`}
                    >
                      {lang.name}
                    </span>

                    {/* Extension / manual badge */}
                    {s.source === 'extension' && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-purple-200/70 bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                        <Icon name="sparkles" className="h-2.5 w-2.5" />
                        Extension
                      </span>
                    )}
                  </div>

                  {/* Solver name & stats */}
                  <div className="mt-1 flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
                    <span>
                      solved by <span className="font-semibold text-slate-700">{solverName}</span>
                    </span>

                    {s.timeSpentMin > 0 && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Icon name="clock" className="h-3 w-3 text-slate-400" />
                          {s.timeSpentMin} min
                        </span>
                      </>
                    )}

                    {s.tries > 0 && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">
                          {s.tries} {s.tries === 1 ? 'attempt' : 'attempts'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Solved status & time */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pl-13 sm:pl-0">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-full px-2 py-0.5">
                  <Icon name="check" className="h-3 w-3 text-emerald-600" />
                  Accepted
                </span>
                <span className="sm:mt-1 text-[11px] text-slate-400 font-medium">
                  {timeAgo(s.createdAt)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}