'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { ProblemSolveCard } from '@/components/student/problem-solve-card';
import { formatDate } from '@/lib/format';
import type { ContestDto, ContestProblemDto } from '@/lib/api';

/** Student Contests board — expandable contests with link to full Contest Detail Board (SPEC §6.8). */
export function ContestsBoard({
  contests,
  problemsByContest,
  solved,
  solvers,
  myId,
}: {
  contests: ContestDto[];
  problemsByContest: Map<string, ContestProblemDto[]>;
  solved: Set<string>;
  solvers: Map<string, { userId: string; name: string; avatarUrl: string | null }[]>;
  myId?: string;
}) {
  const [open, setOpen] = useState<string | null>(contests[0]?.id ?? null);

  if (contests.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contests</h1>
        </header>
        <section className="card p-10 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-4xl">🏆</p>
          <h2 className="mt-2 text-base font-bold text-slate-800">No contests for your program yet</h2>
          <p className="mt-1 text-sm text-slate-500">Your head of education will schedule contests for your group.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contests</h1>
        <p className="mt-1 text-sm text-slate-500">
          A2SV contests and their questions — solve live, then upsolve after the standing is published.
        </p>
      </header>

      <ul className="space-y-3">
        {contests.map((contest) => {
          const questions = problemsByContest.get(contest.id) ?? [];
          const solvedCount = questions.filter((p) => solved.has(p.problemId)).length;
          const expanded = open === contest.id;
          return (
            <li key={contest.id} className="card overflow-hidden p-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpen(expanded ? null : contest.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpen(expanded ? null : contest.id);
                  }
                }}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 cursor-pointer select-none"
                aria-expanded={expanded}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`chip text-white font-medium ${contest.type === 'super' ? 'bg-violet-600' : 'bg-a2sv-500'}`}>
                      {contest.type === 'super' ? 'Super' : 'Standard'}
                    </span>
                    {contest.unrated && <span className="chip bg-slate-100 text-slate-500">Unrated</span>}
                    {contest.standingsLink && (
                      <a
                        href={contest.standingsLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="chip bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        Standing ↗
                      </a>
                    )}
                    <span className="chip bg-slate-100 text-slate-500">
                      <Icon name="clock" className="mr-1 h-3 w-3" />
                      {formatDate(contest.date)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 truncate text-base font-bold text-slate-900">
                    {contest.number ? `${contest.name} #${contest.number}` : contest.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {questions.length} question{questions.length === 1 ? '' : 's'} · {solvedCount} solved
                    {contest.groupNames.length > 0 && ` · ${contest.groupNames.join(', ')}`}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Link
                    href={`/contests/${contest.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                  >
                    <span>View Contest Board</span>
                    <Icon name="chevronRight" className="h-3 w-3" />
                  </Link>

                  <div className={`p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition ${expanded ? 'rotate-180 text-slate-600' : ''}`}>
                    <Icon name="chevronDown" className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-slate-100 p-4">
                  {questions.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-500">Questions will appear once attached.</p>
                  ) : (
                    <ul className="grid gap-3 md:grid-cols-2">
                      {questions.map((p) => (
                        <li key={p.problemId}>
                          <ProblemSolveCard
                            problem={{
                              id: p.problemId,
                              name: p.name,
                              difficulty: p.difficulty,
                              platform: p.platform,
                              tags: p.tags ?? [],
                              link: p.link,
                              createdAt: p.createdAt,
                            }}
                            solved={solved.has(p.problemId)}
                            letter={p.pseudo}
                            solvers={solvers.get(p.problemId) ?? []}
                            myId={myId}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}