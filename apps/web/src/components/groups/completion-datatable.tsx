'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import type { CompletionRow, TrackOption, GroupProgressSummary } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

import { Avatar } from '@/components/avatar';

const SORT_OPTIONS = [
  { value: 'pct_desc', label: 'Highest Completion %' },
  { value: 'pct_asc', label: 'Lowest Completion % (At Risk First)' },
  { value: 'solved_desc', label: 'Most Problems Solved' },
  { value: 'available_desc', label: 'Most Available Exercises' },
  { value: 'name_asc', label: 'Student Name (A-Z)' },
  { value: 'name_desc', label: 'Student Name (Z-A)' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'good', label: 'Good (≥70%)' },
  { value: 'okay', label: 'Okay (40%–69%)' },
  { value: 'bad', label: 'Needs Focus (<40%)' },
];

/** Determine color scheme based on completion percentage */
function getProgressTheme(pct: number) {
  if (pct >= 70) {
    return {
      tier: 'good' as const,
      label: 'Good',
      barColor: 'bg-emerald-500',
      gradient: 'from-emerald-500 to-emerald-400',
      textColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 border-emerald-200/80 text-emerald-700',
      dotColor: 'bg-emerald-500',
    };
  }
  if (pct >= 40) {
    return {
      tier: 'okay' as const,
      label: 'Okay',
      barColor: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-400',
      textColor: 'text-amber-600',
      badgeBg: 'bg-amber-50 border-amber-200/80 text-amber-700',
      dotColor: 'bg-amber-400',
    };
  }
  return {
    tier: 'bad' as const,
    label: 'Needs Focus',
    barColor: 'bg-rose-500',
    gradient: 'from-rose-500 to-rose-400',
    textColor: 'text-rose-600',
    badgeBg: 'bg-rose-50 border-rose-200/80 text-rose-700',
    dotColor: 'bg-rose-500',
  };
}

export function CompletionDataTable({
  completion,
  tracks = [],
  summary,
}: {
  completion: CompletionRow[];
  tracks?: TrackOption[];
  summary: GroupProgressSummary;
}) {
  // View mode: 'visual' (Image 3 Progress Bar List) vs 'table' (Data Table)
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');
  const [showDetailCompletion, setShowDetailCompletion] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('pct_desc');

  // Track options: Merge tracks from DB with any custom tracks found in byTrack
  const availableTracks = useMemo(() => {
    const list: { id: string; name: string; problemCount?: number }[] = [
      { id: 'all', name: 'All Tracks Combined' },
    ];

    const seenIds = new Set<string>();
    for (const t of tracks) {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        list.push({ id: t.id, name: t.name, problemCount: t.problemCount });
      }
    }

    // Also scan completion rows for any byTrack tracks not yet in list
    for (const row of completion) {
      if (row.byTrack) {
        for (const [tId, tData] of Object.entries(row.byTrack)) {
          if (!seenIds.has(tId)) {
            seenIds.add(tId);
            list.push({ id: tId, name: tData.trackName, problemCount: tData.total });
          }
        }
      }
    }

    // Fallback default tracks if none were created yet in DB
    if (list.length === 1) {
      list.push(
        { id: 'python', name: 'Python Track' },
        { id: 'phase1', name: 'Education Phase I' },
        { id: 'camp1', name: 'Camp I' },
        { id: 'phase2', name: 'Education Phase II' },
        { id: 'camp2', name: 'Camp II' },
      );
    }

    return list;
  }, [tracks, completion]);

  // 1. Compute student-level metrics for the currently selected track
  const studentMetrics = useMemo(() => {
    return completion.map((row) => {
      let solved = row.solved;
      let total = row.total;
      let pct = row.pct;

      if (selectedTrack !== 'all' && row.byTrack && row.byTrack[selectedTrack]) {
        const tr = row.byTrack[selectedTrack];
        solved = tr.solved;
        total = tr.total;
        pct = tr.pct;
      }

      const available = Math.max(0, total - solved);
      const theme = getProgressTheme(pct);

      return {
        userId: row.userId,
        name: row.name,
        avatarUrl: row.avatarUrl ?? null,
        solved,
        total,
        pct,
        available,
        theme,
      };
    });
  }, [completion, selectedTrack]);

  // 2. Compute aggregate team metrics based on the selected track
  const teamAggregate = useMemo(() => {
    if (studentMetrics.length === 0) {
      return {
        totalExercises: summary.totalExercises,
        avgSolved: summary.avgCompleted,
        avgPct: summary.avgCompletionPct,
        avgAvailable: summary.avgAvailable,
        goodCount: 0,
        okayCount: 0,
        badCount: 0,
        goodPct: 0,
        okayPct: 0,
        badPct: 0,
        theme: getProgressTheme(summary.avgCompletionPct),
      };
    }

    const totalExercises = studentMetrics[0]?.total || summary.totalExercises;
    const totalSolvedSum = studentMetrics.reduce((sum, s) => sum + s.solved, 0);
    const avgSolved = Math.round(totalSolvedSum / studentMetrics.length);
    const avgPct = Math.round(studentMetrics.reduce((sum, s) => sum + s.pct, 0) / studentMetrics.length);
    const avgAvailable = Math.max(0, totalExercises - avgSolved);

    let goodCount = 0;
    let okayCount = 0;
    let badCount = 0;

    for (const s of studentMetrics) {
      if (s.theme.tier === 'good') goodCount++;
      else if (s.theme.tier === 'okay') okayCount++;
      else badCount++;
    }

    const totalStudents = studentMetrics.length;
    const goodPct = Math.round((goodCount / totalStudents) * 100);
    const okayPct = Math.round((okayCount / totalStudents) * 100);
    const badPct = Math.max(0, 100 - goodPct - okayPct);

    return {
      totalExercises,
      avgSolved,
      avgPct,
      avgAvailable,
      goodCount,
      okayCount,
      badCount,
      goodPct,
      okayPct,
      badPct,
      theme: getProgressTheme(avgPct),
    };
  }, [studentMetrics, summary]);

  // 3. Filter and sort students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return studentMetrics
      .filter((s) => {
        if (q && !s.name.toLowerCase().includes(q)) return false;
        if (statusFilter !== 'all' && s.theme.tier !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'pct_desc') {
          return b.pct - a.pct || b.solved - a.solved || a.name.localeCompare(b.name);
        }
        if (sortBy === 'pct_asc') {
          return a.pct - b.pct || a.solved - b.solved || a.name.localeCompare(b.name);
        }
        if (sortBy === 'solved_desc') {
          return b.solved - a.solved || b.pct - a.pct || a.name.localeCompare(b.name);
        }
        if (sortBy === 'available_desc') {
          return b.available - a.available || a.pct - b.pct;
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        return 0;
      });
  }, [studentMetrics, searchQuery, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Filter & Control Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="relative min-w-[200px] flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student in completion list…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Track Filter */}
        <div className="min-w-[170px]">
          <select
            value={selectedTrack}
            onChange={(e) => setSelectedTrack(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 cursor-pointer"
          >
            {availableTracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status / Tier Filter */}
        <div className="min-w-[140px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 cursor-pointer"
          >
            {STATUS_FILTER_OPTIONS.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="min-w-[180px]">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 cursor-pointer"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <button
          type="button"
          onClick={() => setViewMode((m) => (m === 'visual' ? 'table' : 'visual'))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer shrink-0"
        >
          <Icon name="sliders" className="h-3.5 w-3.5 text-emerald-600" />
          <span>{viewMode === 'visual' ? 'Detailed Table' : 'Progress Bars'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TOP CARD: TEAM COMPLETION (Matches Image 3 Spec)                           */}
      {/* ========================================================================= */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left: Overall Team Progress Bar with Tiered Coloring */}
          <div className="w-full flex-1 space-y-4 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-between">
              <h2 className="text-xl font-bold text-slate-900">Team Completion</h2>
              <span className={`hidden lg:inline-block rounded-full border px-3 py-0.5 text-xs font-bold ${teamAggregate.theme.badgeBg}`}>
                {teamAggregate.theme.label} Standing
              </span>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="h-6 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${teamAggregate.theme.gradient} transition-all duration-500`}
                style={{ width: `${Math.max(5, teamAggregate.avgPct)}%` }}
              />
            </div>

            {/* Formatted Subtitle Metric Line (Matching Image 3) */}
            <p className="text-xs font-medium text-slate-500 text-center lg:text-left">
              <span className="font-semibold text-slate-700">{teamAggregate.totalExercises}</span> Exercises |{' '}
              <span className="font-semibold text-slate-700">{teamAggregate.avgSolved} Solved (average)</span> |{' '}
              <span className={`font-bold ${teamAggregate.theme.textColor}`}>
                {teamAggregate.avgPct}% Completion
              </span>{' '}
              | <span className="font-semibold text-slate-700">{teamAggregate.avgAvailable} Available (average)</span>
            </p>
          </div>

          {/* Right: SVG Donut Chart Indicator (Matching Image 3) */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative h-28 w-28 grid place-items-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Bad arc (<40%) */}
                {teamAggregate.badPct > 0 && (
                  <path
                    className="text-rose-500 transition-all duration-500"
                    strokeDasharray={`${teamAggregate.badPct}, 100`}
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
                {/* Okay arc (40%-69%) */}
                {teamAggregate.okayPct > 0 && (
                  <path
                    className="text-amber-400 transition-all duration-500"
                    strokeDasharray={`${teamAggregate.okayPct}, 100`}
                    strokeDashoffset={`-${teamAggregate.badPct}`}
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
                {/* Good arc (>=70%) */}
                {teamAggregate.goodPct > 0 && (
                  <path
                    className="text-emerald-500 transition-all duration-500"
                    strokeDasharray={`${teamAggregate.goodPct}, 100`}
                    strokeDashoffset={`-${teamAggregate.badPct + teamAggregate.okayPct}`}
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>

              {/* Center Status Text */}
              <div className="absolute flex flex-col items-center justify-center text-center select-none">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">State</span>
                <span className={`text-xs font-black ${teamAggregate.theme.textColor}`}>
                  {teamAggregate.theme.label}
                </span>
                <span className="text-[10px] font-bold text-slate-600">{teamAggregate.avgPct}%</span>
              </div>
            </div>

            {/* Legend (Matching Image 3) */}
            <div className="mt-2.5 flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Good ({teamAggregate.goodCount})
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Okay ({teamAggregate.okayCount})
              </span>
              <span className="flex items-center gap-1 text-rose-500">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Bad ({teamAggregate.badCount})
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* DETAIL TEAM COMPLETION (Matches Image 3)                                  */}
      {/* ========================================================================= */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div
          className="flex items-center justify-between cursor-pointer select-none border-b border-slate-100 pb-3"
          onClick={() => setShowDetailCompletion((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Detail Team Completion</h3>
            <span className="chip bg-slate-100 text-slate-700 text-xs font-semibold">
              {filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'}
            </span>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1 transition cursor-pointer"
            title={showDetailCompletion ? 'Collapse' : 'Expand'}
          >
            <Icon
              name="chevronRight"
              className={`h-4 w-4 transition-transform duration-200 ${
                showDetailCompletion ? '-rotate-90' : 'rotate-90'
              }`}
            />
          </button>
        </div>

        {showDetailCompletion && (
          <div>
            {/* VIEW MODE 1: VISUAL PROGRESS BARS (Image 3 Exact Spec) */}
            {viewMode === 'visual' && (
              <div className="space-y-3 pt-1">
                {filteredStudents.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No students match your filter criteria.</p>
                ) : (
                  filteredStudents.map((row) => {
                    return (
                      <div
                        key={row.userId}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-1.5 px-2 rounded-xl hover:bg-slate-50/70 transition group"
                      >
                        {/* Student Avatar & Name */}
                        <div className="flex items-center gap-2.5 min-w-0 sm:w-44 shrink-0">
                          <Avatar name={row.name} url={row.avatarUrl} size="h-7 w-7 text-xs" />
                          <Link
                            href={`/profile?userId=${row.userId}`}
                            className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 truncate block transition"
                          >
                            {row.name}
                          </Link>
                        </div>

                        {/* Metric Line: {solved} Solved | {pct}% Completion | {available} Available */}
                        <div className="min-w-0 sm:w-64 shrink-0 sm:text-right text-xs font-medium text-slate-600">
                          <span className="font-bold text-slate-800">{row.solved} Solved</span> |{' '}
                          <span className={`font-bold ${row.theme.textColor}`}>{row.pct}% Completion</span> |{' '}
                          <span className="text-slate-500">{row.available} Available</span>
                        </div>

                        {/* Progress Bar with Dynamic Progress Tier Color */}
                        <div className="h-2.5 flex-1 rounded-full bg-slate-100 overflow-hidden shadow-2xs">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${row.theme.barColor}`}
                            style={{ width: `${row.pct}%` }}
                            title={`${row.name}: ${row.pct}% (${row.theme.label})`}
                          />
                        </div>

                        {/* Status Chip */}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 text-center ${row.theme.badgeBg}`}>
                          {row.theme.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* VIEW MODE 2: DETAILED DATA TABLE */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 min-w-[200px]">Student</th>
                      <th className="py-3 px-3 text-center">Solved</th>
                      <th className="py-3 px-3 text-center">Available</th>
                      <th className="py-3 px-3 text-center">Total Assigned</th>
                      <th className="py-3 px-3 min-w-[160px]">Completion Progress</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                          No students match your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((row, idx) => {
                        return (
                          <tr key={row.userId} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <Link
                                href={`/profile?userId=${row.userId}`}
                                className="flex items-center gap-2 hover:text-emerald-700 transition"
                              >
                                <Avatar name={row.name} url={row.avatarUrl} size="h-7 w-7 text-xs" />
                                <span className="font-bold text-slate-900 truncate">{row.name}</span>
                              </Link>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-800">
                                {row.solved}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                              {row.available}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-600">
                              {row.total}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className={row.theme.textColor}>{row.pct}%</span>
                                  <span className="text-slate-400 font-normal">
                                    {row.solved}/{row.total}
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${row.theme.barColor}`}
                                    style={{ width: `${row.pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${row.theme.badgeBg}`}
                              >
                                {row.theme.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

