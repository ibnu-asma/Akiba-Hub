'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { TRACK_PHASE_LABELS, type TrackPhase } from '@hub/shared';
import { Icon } from '@/components/icon';
import type { TrackDto } from '@/lib/api';
import type { Solver } from '@/lib/student';

export interface TrackProblem {
  id: string;
  name: string;
  platform: string;
  difficulty: string;
  tags: string[];
  link: string;
  sortOrder: number;
  createdAt?: string;
}

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

function formatDayDate(iso?: string | null): string {
  if (!iso) return 'Today';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Today';
  return d
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' })
    .replace(',', '');
}

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p === 'leetcode') {
    return (
      <svg className="h-3.5 w-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.247 2.198 5.864 2.189 8.098-.02l3.708-3.666a1.375 1.375 0 1 0-1.94-1.948l-3.707 3.666c-1.16 1.147-3.044 1.152-4.21-.019l-4.275-4.192a3.176 3.176 0 0 1-.682-.973 3.328 3.328 0 0 1-.194-.578 3.376 3.376 0 0 1-.038-1.438 3.09 3.09 0 0 1 .712-1.237L9.08 7.643l5.362-5.75A1.376 1.376 0 0 0 13.483 0zm-2.88 7.218a1.375 1.375 0 0 0-1.229.76l-1.78 3.56a1.375 1.375 0 1 0 2.457 1.23l1.78-3.56a1.375 1.375 0 0 0-1.228-1.99z" />
      </svg>
    );
  }
  if (p === 'codeforces') {
    return (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path fill="#FFD400" d="M4.5 7.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 0 19.5V9a1.5 1.5 0 0 1 1.5-1.5h3Z" />
        <path fill="#005BFF" d="M13.5 3a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 10.5 3h3Z" />
        <path fill="#FF002B" d="M22.5 12a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5h3Z" />
      </svg>
    );
  }
  return <Icon name="code" className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
}

const DIFF_STYLES: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200/70',
  hard: 'bg-rose-50 text-rose-700 border border-rose-200/70',
};

/** Refined Student Track detail board matching the mockup design. */
export function TrackDetailBoard({
  track,
  problems,
  solved,
  solvers,
  teammates,
  myId,
  myName,
  myAvatarUrl,
  isHead,
}: {
  track: TrackDto;
  problems: TrackProblem[];
  solved: Set<string>;
  solvers: Map<string, Solver[]>;
  teammates: Teammate[];
  myId: string;
  myName: string;
  myAvatarUrl: string | null;
  isHead?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalExercises = problems.length;

  // Calculate per-teammate solved count in this track
  const teammateStats = useMemo(() => {
    return teammates
      .map((mate) => {
        const count = problems.filter((p) => {
          const pSolvers = solvers.get(p.id) ?? [];
          return pSolvers.some((s) => s.userId === mate.id) || (mate.id === myId && solved.has(p.id));
        }).length;
        const pct = totalExercises > 0 ? Math.round((count / totalExercises) * 100) : 0;
        return {
          ...mate,
          count,
          pct,
        };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [teammates, problems, solvers, myId, solved, totalExercises]);

  // Overall Team Statistics
  const avgSolved = useMemo(() => {
    if (teammateStats.length === 0) {
      return problems.filter((p) => solved.has(p.id)).length;
    }
    const sum = teammateStats.reduce((acc, curr) => acc + curr.count, 0);
    return Math.round(sum / teammateStats.length);
  }, [teammateStats, problems, solved]);

  const completionPct = totalExercises > 0 ? Math.round((avgSolved / totalExercises) * 100) : 0;
  const availableAverage = Math.max(0, totalExercises - avgSolved);

  
  const stateLabel = completionPct >= 80 ? 'Good' : completionPct >= 50 ? 'Okay' : 'Bad';
  const colorHex = completionPct >= 80 ? '#22c55e' : completionPct >= 50 ? '#eab308' : '#ef4444';
  const bgColorHex = completionPct >= 80 ? '#dcfce7' : completionPct >= 50 ? '#fef3c7' : '#fee2e2';


  // Group problems by date — sorted with NEWEST date at the TOP
  const groupedProblems = useMemo(() => {
    const map = new Map<string, { timestamp: number; problems: TrackProblem[] }>();
    for (const prob of problems) {
      const iso = prob.createdAt ?? track.createdAt;
      const dateKey = formatDayDate(iso);
      const time = iso ? new Date(iso).getTime() : 0;
      const entry = map.get(dateKey) ?? { timestamp: time, problems: [] };
      entry.problems.push(prob);
      if (time > entry.timestamp) entry.timestamp = time;
      map.set(dateKey, entry);
    }
    // Sort descending by timestamp: newest day questions at the top!
    return [...map.entries()]
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .map(([dateKey, entry]) => [dateKey, entry.problems] as [string, TrackProblem[]]);
  }, [problems, track.createdAt]);

  // Donut chart calculations (Circumference C = 2 * PI * r)
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const greenLength = (completionPct / 100) * circumference;
  
  return (
    <div className="space-y-6">
      {/* Top Track Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{track.name}</h1>
            <span className="chip bg-a2sv-500 text-white font-medium text-xs">
              {TRACK_PHASE_LABELS[track.phase as TrackPhase] ?? track.phase}
            </span>
            {track.superGroupName && <span className="chip bg-slate-100 text-slate-600 text-xs">{track.superGroupName}</span>}
          </div>
          <p className="mt-1 text-sm text-slate-500 line-clamp-2 max-w-2xl">
            A curated learning track for your cohort.
          </p>
        </div>
        {isHead && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/tracks/${track.id}/edit`} className="btn-secondary py-1.5 px-3 text-sm">
              Edit Track
            </Link>
            <Link href={`/exercises/new?trackId=${track.id}`} className="btn-primary py-1.5 px-3 text-sm shadow-sm">
              + Assign Exercises
            </Link>
          </div>
        )}
      </header>

      {/* Main Team Completion Card */}
      <section className="card p-6 md:p-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left Column: Progress Bar + Stats */}
          <div className="flex-1 w-full flex flex-col items-center">
            <h2 className="text-base md:text-lg font-bold text-slate-800 text-center mb-3">
              Team Completion
            </h2>

            {/* Thick Horizontal Progress Bar */}
            <div className="w-full max-w-2xl h-5 rounded-full overflow-hidden p-0.5 shadow-inner" style={{ backgroundColor: bgColorHex }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out" style={{ backgroundColor: colorHex, width: `${Math.min(100, Math.max(0, completionPct))}%` }}
              />
            </div>

            {/* Summary Metrics Text */}
            <p className="mt-3 text-center text-xs md:text-sm text-slate-500 font-medium">
              {totalExercises} Exercises | {avgSolved} Solved (average) | {completionPct}% Completion | {availableAverage} Available (average)
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
                  className="stroke-slate-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Dynamic Progress Segment */}
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  stroke={colorHex}
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
                <span className="text-[11px] font-bold" style={{ color: colorHex }}>{completionPct}%</span>
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
                          <img src={mate.avatarUrl} alt={mate.name} className="h-full w-full object-cover" />
                        ) : (
                          initials(mate.name)
                        )}
                      </span>
                    </Link>

                    {/* Clickable Username */}
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
                          {mate.count} / {totalExercises} · {mate.pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            mate.pct >= 80 ? 'bg-[#22c55e]' : mate.pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, mate.pct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {teammateStats.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">No teammates found in this group.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Date & Topic Grouped Problem Sections (Newest dates at the top) */}
      {groupedProblems.map(([dateKey, probs]) => {
        const uniqueTags = Array.from(new Set(probs.flatMap((p) => p.tags))).filter(Boolean);

        return (
          <section key={dateKey} className="space-y-3.5">
            {/* Header: Date + Topic Pills */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="text-sm font-bold text-slate-800 shrink-0">{dateKey}</span>
              {uniqueTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {uniqueTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 2-Column Problem Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {probs.map((prob) => {
                const isSolved = solved.has(prob.id);
                const probSolvers = solvers.get(prob.id) ?? [];
                const diffClass = DIFF_STYLES[prob.difficulty.toLowerCase()] ?? DIFF_STYLES.easy;
                const isBookmarked = bookmarkedIds.has(prob.id);

                return (
                  <article
                    key={prob.id}
                    className={`rounded-xl transition-all p-4 flex flex-col justify-between shadow-xs hover:shadow-md ${
                      isSolved
                        ? 'bg-[#f0fdf4] border-2 border-[#86efac]/90'
                        : 'bg-white border border-slate-200/80'
                    }`}
                  >
                    <div>
                      {/* Top Row: Difficulty badge + Solved badge + Name + Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 capitalize ${diffClass}`}>
                            {prob.difficulty}
                          </span>
                          {isSolved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 rounded-md shrink-0">
                              <Icon name="check" className="h-3 w-3" />
                              Solved
                            </span>
                          )}
                          <a
                            href={prob.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-bold text-slate-800 hover:text-emerald-600 transition truncate"
                            title={prob.name}
                          >
                            {prob.name}
                          </a>
                        </div>

                        {/* Top-Right Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/problems/${prob.id}/submission`}
                            className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
                          >
                            <span className="text-sm leading-none">+</span> New Solution
                          </Link>
                          <a
                            href={prob.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-slate-700 p-0.5 transition"
                            aria-label={`Open ${prob.name}`}
                          >
                            <Icon name="externalLink" className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(prob.id)}
                            className={`p-0.5 transition cursor-pointer ${
                              isBookmarked ? 'text-amber-500 fill-amber-500' : 'text-slate-400 hover:text-slate-700'
                            }`}
                            aria-label="Bookmark problem"
                          >
                            <Icon name="bookmark" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Middle: Tags + Platform Badge */}
                      <div className="mt-2.5 space-y-2">
                        {prob.tags.length > 0 && (
                          <div>
                            <span className="inline-block px-2.5 py-0.5 text-[11px] font-medium text-slate-600 bg-slate-100 rounded-md">
                              {prob.tags.join(', ')}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200/80 rounded-full w-fit">
                          <PlatformIcon platform={prob.platform} />
                          <span className="capitalize">{prob.platform}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Solver Count + Clickable Avatar Stack */}
                    <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2.5">
                      {probSolvers.length > 0 && (
                        <>
                          <span className="text-xs font-semibold text-slate-400 mr-1.5">{probSolvers.length}</span>
                          <div className="flex items-center -space-x-1.5">
                            {probSolvers.slice(0, 8).map((solver) => {
                              const sProfileHref = solver.userId === myId ? '/profile' : `/profile?userId=${solver.userId}`;
                              return (
                                <Link
                                  key={solver.userId}
                                  href={sProfileHref}
                                  title={`${solver.name} (view profile)`}
                                  className="transition-transform hover:scale-110 hover:z-10"
                                >
                                  <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-slate-600 text-[10px] font-semibold text-white ring-2 ring-white hover:ring-emerald-400 transition">
                                    {solver.avatarUrl ? (
                                      <img src={solver.avatarUrl} alt={solver.name} className="h-full w-full object-cover" />
                                    ) : (
                                      initials(solver.name)
                                    )}
                                  </span>
                                </Link>
                              );
                            })}
                            {probSolvers.length > 8 && (
                              <span className="ml-1 text-[10px] font-medium text-slate-400">
                                +{probSolvers.length - 8}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {problems.length === 0 && (
        <section className="card p-10 text-center bg-white rounded-2xl border border-slate-100">
          <p className="text-3xl">📚</p>
          <p className="mt-2 text-sm text-slate-500">No exercises assigned to this track yet.</p>
        </section>
      )}
    </div>
  );
}