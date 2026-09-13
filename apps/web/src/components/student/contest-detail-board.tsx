'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { ProblemSolveCard } from '@/components/student/problem-solve-card';
import { formatDate } from '@/lib/format';
import type { ContestDto, ContestProblemDto } from '@/lib/api';
import type { Solver } from '@/lib/student';

export interface Teammate {
  id: string;
  name: string;
  avatarUrl: string | null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/**
 * Contest detail board — styled to match the Track Detail page design:
 * Team Completion progress, donut state gauge, collapsible Detail Team Completions,
 * and contest questions with solved indicators and solver avatars.
 */
export function ContestDetailBoard({
  contest,
  problems,
  solved,
  solvers,
  teammates,
  myId,
}: {
  contest: ContestDto;
  problems: ContestProblemDto[];
  solved: Set<string>;
  solvers: Map<string, Solver[]>;
  teammates: Teammate[];
  myId: string;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('hub_bookmarked_problems');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem('hub_bookmarked_problems', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const totalQuestions = problems.length;

  // Calculate per-teammate solved count in this contest
  const teammateStats = useMemo(() => {
    return teammates
      .map((mate) => {
        const count = problems.filter((p) => {
          const pSolvers = solvers.get(p.problemId) ?? [];
          return pSolvers.some((s) => s.userId === mate.id) || (mate.id === myId && solved.has(p.problemId));
        }).length;
        const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
        return {
          ...mate,
          count,
          pct,
        };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [teammates, problems, solvers, myId, solved, totalQuestions]);

  // Overall Team Statistics
  const avgSolved = useMemo(() => {
    if (teammateStats.length === 0) {
      return problems.filter((p) => solved.has(p.problemId)).length;
    }
    const sum = teammateStats.reduce((acc, curr) => acc + curr.count, 0);
    return Math.round(sum / teammateStats.length);
  }, [teammateStats, problems, solved]);

  const completionPct = totalQuestions > 0 ? Math.round((avgSolved / totalQuestions) * 100) : 0;
  const availableAverage = Math.max(0, totalQuestions - avgSolved);

  const stateLabel = completionPct >= 80 ? 'Good' : completionPct >= 50 ? 'Okay' : 'Bad';

  // Donut gauge circumference
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const greenLength = (completionPct / 100) * circumference;
  const okayLength = 0.09 * circumference;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="space-y-3">
        <Link
          href="/contests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <Icon name="chevronRight" className="h-3.5 w-3.5 rotate-180" />
          Back to all contests
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {contest.number ? `${contest.name} #${contest.number}` : contest.name}
            </h1>
            <span
              className={`chip font-medium text-xs text-white ${
                contest.type === 'super' ? 'bg-violet-600' : 'bg-a2sv-500'
              }`}
            >
              {contest.type === 'super' ? 'Super Contest' : 'Standard'}
            </span>
            {contest.unrated && <span className="chip bg-slate-100 text-slate-500 text-xs">Unrated</span>}
            {contest.standingsLink && (
              <a
                href={contest.standingsLink}
                target="_blank"
                rel="noreferrer"
                className="chip bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition text-xs font-semibold"
              >
                Standing ↗
              </a>
            )}
            <span className="chip bg-slate-100 text-slate-600 text-xs">
              <Icon name="clock" className="mr-1 h-3 w-3" />
              {formatDate(contest.date)}
            </span>
            {contest.groupNames && contest.groupNames.length > 0 && (
              <span className="chip bg-slate-100 text-slate-500 text-xs">
                {contest.groupNames.join(', ')}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Team Completion Card (Matching Track Detail design) */}
      <section className="card p-6 md:p-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left Column: Progress Bar + Stats */}
          <div className="flex-1 w-full flex flex-col items-center">
            <h2 className="text-base md:text-lg font-bold text-slate-800 text-center mb-3">
              Team Completion
            </h2>

            {/* Thick Horizontal Progress Bar */}
            <div className="w-full max-w-2xl h-5 bg-[#c5f2c7] rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full bg-[#22c55e] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, completionPct))}%` }}
              />
            </div>

            {/* Summary Metrics Text */}
            <p className="mt-3 text-center text-xs md:text-sm text-slate-500 font-medium">
              {totalQuestions} Questions | {avgSolved} Solved (average) | {completionPct}% Completion | {availableAverage} Available (average)
            </p>
          </div>

          {/* Right Column: Donut Gauge + Legend */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 88 88">
                {/* Background Ring (Red/Remaining) */}
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  className="stroke-[#ef4444]"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Okay Segment (Yellow) */}
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  className="stroke-[#eab308]"
                  strokeWidth="8"
                  strokeDasharray={`${okayLength} ${circumference}`}
                  strokeDashoffset={`-${greenLength}`}
                  fill="transparent"
                />
                {/* Good Segment (Green) */}
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  className="stroke-[#22c55e]"
                  strokeWidth="8"
                  strokeDasharray={`${greenLength} ${circumference}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Centered Donut Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">State</span>
                <span className="text-sm font-extrabold text-slate-800 leading-tight">{stateLabel}</span>
                <span className="text-[11px] font-bold text-[#22c55e]">{completionPct}%</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 text-[11px] font-medium text-slate-500 mt-2.5">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#22c55e]" /> Good
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#eab308]" /> Okay
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#ef4444]" /> Bad
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Detail Team Completion Accordion */}
        <div className="border-t border-slate-100 pt-3 mt-6">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex w-full items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 py-1 transition cursor-pointer"
          >
            <span>Detail Team Completion</span>
            <Icon
              name="chevronDown"
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
            />
          </button>

          {showDetails && (
            <div className="mt-4 pt-2 border-t border-slate-50 space-y-3">
              {teammateStats.map((mate) => {
                const profileHref = mate.id === myId ? '/profile' : `/profile?userId=${mate.id}`;

                return (
                  <div key={mate.id} className="flex items-center gap-3 text-xs group">
                    {/* Clickable Student Photo */}
                    <Link
                      href={profileHref}
                      className="shrink-0 transition-transform hover:scale-105"
                      title={`View ${mate.name}'s profile`}
                    >
                      <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 hover:ring-2 hover:ring-emerald-400 transition">
                        {mate.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mate.avatarUrl} alt={mate.name} className="h-full w-full object-cover" />
                        ) : (
                          initials(mate.name)
                        )}
                      </span>
                    </Link>

                    {/* Clickable Username & Progress */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <Link
                          href={profileHref}
                          className={`font-medium truncate hover:underline hover:text-emerald-600 transition ${
                            mate.id === myId ? 'text-emerald-700 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {mate.name} {mate.id === myId && '(you)'}
                        </Link>
                        <span className="text-slate-400 shrink-0 ml-2">
                          {mate.count} / {totalQuestions} · {mate.pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            mate.pct >= 80 ? 'bg-[#22c55e]' : mate.pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, mate.pct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Contest Questions Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Contest Questions ({problems.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Solve during the contest window or upsolve after standing is published.
          </p>
        </div>

        {problems.length === 0 ? (
          <div className="card p-10 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <p className="text-3xl">🏆</p>
            <p className="mt-2 text-sm text-slate-500">
              No questions attached yet — your head of education will attach them soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {problems.map((p) => (
              <ProblemSolveCard
                key={p.problemId}
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
                isBookmarked={bookmarkedIds.has(p.problemId)}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

