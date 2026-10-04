'use client';

import { useState, useMemo, useEffect } from 'react';
import { TRACK_PHASE_LABELS, type TrackPhase } from '@hub/shared';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { ProblemSolveCard } from '@/components/student/problem-solve-card';
import type { ExerciseDto } from '@/lib/api';

const ALL = '__all__';
const DIFFS = [
  { value: ALL, label: 'All Difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const STATUS_OPTIONS = [
  { value: ALL, label: 'All Statuses' },
  { value: 'unsolved', label: 'Unsolved' },
  { value: 'solved', label: 'Solved' },
];

const PAGE_SIZES = [
  { value: '10', label: '10 per page' },
  { value: '20', label: '20 per page' },
  { value: '50', label: '50 per page' },
  { value: 'all', label: 'All exercises' },
];

/**
 * Student Exercises — problem sets grouped by track in collapsible parent cards,
 * with modern search/filtering, newest problems first, and pagination (SPEC §6.9).
 */
export function ExercisesBoard({
  exercises,
  solved,
  solvers,
  mySuperGroupId,
  myId,
  isHead,
}: {
  exercises: ExerciseDto[];
  solved: Set<string>;
  solvers: Map<string, { userId: string; name: string; avatarUrl: string | null }[]>;
  mySuperGroupId: string | null;
  myId?: string;
  isHead?: boolean;
}) {
  // Filter States
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);
  const [trackFilter, setTrackFilter] = useState(ALL);

  // Pagination States
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState('10');

  // Collapsed Track Cards (set of trackIds that are collapsed; default empty = all expanded)
  const [collapsedTracks, setCollapsedTracks] = useState<Set<string>>(new Set());

  // Shared Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('hub_bookmarked_problems');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });


  const handleRemove = async (trackId: string, problemId: string, problemName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${problemName}" from this track?`)) return;
    try {
      await fetch(`/api/admin/tracks/${trackId}/problems/${problemId}`, { method: 'DELETE' });
      window.location.reload();
    } catch {
      alert('Failed to remove exercise');
    }
  };

  const toggleBookmark = (problemId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) next.delete(problemId);
      else next.add(problemId);
      try {
        localStorage.setItem('hub_bookmarked_problems', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  // Extract unique platforms & tracks for dropdown filters
  const platformOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ex of exercises) {
      if (ex.platform) set.add(ex.platform.toLowerCase());
    }
    return [
      { value: ALL, label: 'All Platforms' },
      ...Array.from(set).map((p) => ({
        value: p,
        label: p.charAt(0).toUpperCase() + p.slice(1),
      })),
    ];
  }, [exercises]);

  const trackOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const ex of exercises) {
      if (ex.trackId && !map.has(ex.trackId)) {
        map.set(ex.trackId, ex.trackName);
      }
    }
    return [
      { value: ALL, label: 'All Tracks' },
      ...Array.from(map.entries()).map(([id, name]) => ({
        value: id,
        label: name,
      })),
    ];
  }, [exercises]);

  // Reset page to 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [q, diff, status, platform, trackFilter, pageSize]);

  // Filter and sort exercises: Newly added problems on top
  const filteredExercises = useMemo(() => {
    const query = q.trim().toLowerCase();

    return exercises
      .filter((ex) => {
        // Search query: problem name, tags, or track name
        if (query) {
          const matchName = ex.problemName.toLowerCase().includes(query);
          const matchTrack = ex.trackName.toLowerCase().includes(query);
          const matchTag = ex.tags?.some((t) => t.toLowerCase().includes(query));
          if (!matchName && !matchTrack && !matchTag) return false;
        }

        // Difficulty filter
        if (diff !== ALL && ex.difficulty.toLowerCase() !== diff.toLowerCase()) {
          return false;
        }

        // Status filter
        const isProbSolved = solved.has(ex.problemId) || (Boolean(isHead) && (solvers.get(ex.problemId)?.length ?? 0) > 0);
        if (status === 'solved' && !isProbSolved) return false;
        if (status === 'unsolved' && isProbSolved) return false;

        // Platform filter
        if (platform !== ALL && ex.platform.toLowerCase() !== platform.toLowerCase()) {
          return false;
        }

        // Track filter
        if (trackFilter !== ALL && ex.trackId !== trackFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort newest added problem to the top (descending createdAt)
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return b.sortOrder - a.sortOrder;
      });
  }, [exercises, q, diff, status, platform, trackFilter, solved, solvers, isHead]);

  // Pagination calculations
  const totalCount = filteredExercises.length;
  const sizeNum = pageSize === 'all' ? totalCount : Number.parseInt(pageSize, 10);
  const totalPages = sizeNum > 0 ? Math.ceil(totalCount / sizeNum) : 1;
  const safePage = Math.min(page, Math.max(0, totalPages - 1));

  const pagedExercises = useMemo(() => {
    if (pageSize === 'all') return filteredExercises;
    const start = safePage * sizeNum;
    return filteredExercises.slice(start, start + sizeNum);
  }, [filteredExercises, safePage, sizeNum, pageSize]);

  // Group the current page's exercises by Track
  // Track sorting: parent tracks with newest problems appear first
  const groupedTracks = useMemo(() => {
    const map = new Map<string, { trackId: string; trackName: string; phase: string; superGroupId: string; superGroupName: string; newestTime: number; problems: ExerciseDto[] }>();

    for (const ex of pagedExercises) {
      const time = ex.createdAt ? new Date(ex.createdAt).getTime() : 0;
      const entry = map.get(ex.trackId) ?? {
        trackId: ex.trackId,
        trackName: ex.trackName,
        phase: ex.phase,
        superGroupId: ex.superGroupId,
        superGroupName: ex.superGroupName,
        newestTime: time,
        problems: [],
      };
      entry.problems.push(ex);
      if (time > entry.newestTime) entry.newestTime = time;
      map.set(ex.trackId, entry);
    }

    // Sort tracks by newest problem first
    return Array.from(map.values()).sort((a, b) => {
      if (b.newestTime !== a.newestTime) return b.newestTime - a.newestTime;
      return a.trackName.localeCompare(b.trackName);
    });
  }, [pagedExercises]);

  // Total problems per track across the whole dataset (for progress metrics)
  const trackMetrics = useMemo(() => {
    const counts = new Map<string, { total: number; solved: number }>();
    for (const ex of exercises) {
      const curr = counts.get(ex.trackId) ?? { total: 0, solved: 0 };
      curr.total += 1;
      const isProbSolved = solved.has(ex.problemId) || (Boolean(isHead) && (solvers.get(ex.problemId)?.length ?? 0) > 0);
      if (isProbSolved) curr.solved += 1;
      counts.set(ex.trackId, curr);
    }
    return counts;
  }, [exercises, solved, solvers, isHead]);

  // Toggle single track collapse
  const toggleTrack = (trackId: string) => {
    setCollapsedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  // Expand / Collapse all
  const allCollapsed = groupedTracks.length > 0 && groupedTracks.every((t) => collapsedTracks.has(t.trackId));
  const toggleAllTracks = () => {
    if (allCollapsed) {
      setCollapsedTracks(new Set());
    } else {
      setCollapsedTracks(new Set(groupedTracks.map((t) => t.trackId)));
    }
  };

  const hasActiveFilters = q.trim() !== '' || diff !== ALL || status !== ALL || platform !== ALL || trackFilter !== ALL;
  const resetFilters = () => {
    setQ('');
    setDiff(ALL);
    setStatus(ALL);
    setPlatform(ALL);
    setTrackFilter(ALL);
  };

  const startItem = totalCount === 0 ? 0 : safePage * sizeNum + 1;
  const endItem = pageSize === 'all' ? totalCount : Math.min((safePage + 1) * sizeNum, totalCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exercises</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse and solve track problem sets, submit solutions, and track your team's progress.
          </p>
        </div>
        {isHead && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/exercises/new" className="btn-primary py-2 px-4 text-sm shadow-sm">
              + Add Exercise
            </Link>
          </div>
        )}

        {groupedTracks.length > 0 && (
          <button
            type="button"
            onClick={toggleAllTracks}
            className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer"
          >
            <Icon name="sliders" className="h-3.5 w-3.5 text-slate-500" />
            <span>{allCollapsed ? 'Expand All Tracks' : 'Collapse All Tracks'}</span>
          </button>
        )}
      </header>

      {/* Modernized Search & Filtering Toolbar */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-xs space-y-3.5">
        {/* Search Row */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises by problem name, track, or tags…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
          {q.trim() && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              aria-label="Clear search"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Difficulty Dropdown */}
          <div className="min-w-[140px] flex-1 sm:flex-initial">
            <select
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
            >
              {DIFFS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="min-w-[130px] flex-1 sm:flex-initial">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Dropdown */}
          <div className="min-w-[130px] flex-1 sm:flex-initial">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
            >
              {platformOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Track Dropdown */}
          <div className="min-w-[160px] flex-1 sm:flex-initial">
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer truncate"
            >
              {trackOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Page Size Selector */}
          <div className="min-w-[130px] flex-1 sm:flex-initial">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
            >
              {PAGE_SIZES.map((ps) => (
                <option key={ps.value} value={ps.value}>
                  {ps.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline px-2 py-1 transition cursor-pointer"
            >
              Reset filters
            </button>
          )}

          {/* Results Summary */}
          <span className="ml-auto text-xs font-medium text-slate-500 shrink-0">
            {totalCount} {totalCount === 1 ? 'exercise' : 'exercises'} found
          </span>
        </div>
      </section>

      {/* Empty State */}
      {totalCount === 0 ? (
        <section className="card p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-4xl">💻</p>
          <h3 className="mt-3 text-base font-bold text-slate-900">No exercises match your search</h3>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your keywords, difficulty, or platform filters.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn-primary mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs"
            >
              Clear all filters
            </button>
          )}
        </section>
      ) : (
        /* Collapsible Track Parent Cards */
        <div className="space-y-5">
          {groupedTracks.map((group) => {
            const isCollapsed = collapsedTracks.has(group.trackId);
            const isMine = mySuperGroupId != null && group.superGroupId === mySuperGroupId;
            const metrics = trackMetrics.get(group.trackId) ?? { total: group.problems.length, solved: 0 };
            const isAllSolved = metrics.total > 0 && metrics.solved === metrics.total;

            return (
              <section
                key={group.trackId}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Collapsible Track Card Header */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleTrack(group.trackId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleTrack(group.trackId);
                    }
                  }}
                  className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-slate-50/70 transition cursor-pointer select-none"
                  aria-expanded={!isCollapsed}
                >
                  {/* Left: Track Name + Phase + SuperGroup + My Program */}
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    <h2 className="text-base md:text-lg font-bold text-slate-900 hover:text-emerald-700 transition">
                      {group.trackName}
                    </h2>
                    <span className="chip bg-a2sv-500 text-white font-medium text-xs">
                      {TRACK_PHASE_LABELS[group.phase as TrackPhase] ?? group.phase}
                    </span>
                    {group.superGroupName && (
                      <span className="chip bg-slate-100 text-slate-600 text-xs font-normal">
                        {group.superGroupName}
                      </span>
                    )}
                    {isMine && (
                      <span className="chip bg-emerald-100 text-emerald-800 text-xs font-semibold">
                        My Track
                      </span>
                    )}
                  </div>

                  {/* Right: Solved Progress Pill + Total Exercises + Chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isAllSolved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {metrics.solved} / {metrics.total} solved
                    </span>
                    <span className="text-xs text-slate-400">
                      {group.problems.length} {group.problems.length === 1 ? 'exercise' : 'exercises'}
                    </span>
                    <div
                      className={`grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600 transition-transform duration-200 ${
                        isCollapsed ? '' : 'rotate-180'
                      }`}
                    >
                      <Icon name="chevronDown" className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Collapsible Card Content: 2-Column Grid of Problem Cards */}
                {!isCollapsed && (
                  <div className="p-5 pt-0 border-t border-slate-100">
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.problems.map((ex) => (
                        <ProblemSolveCard
                          key={ex.id}
                          isHead={isHead}
                          onRemove={isHead ? () => handleRemove(ex.trackId, ex.problemId, ex.problemName) : undefined}
                          problem={{
                            id: ex.problemId,
                            name: ex.problemName,
                            difficulty: ex.difficulty,
                            platform: ex.platform,
                            tags: ex.tags ?? [],
                            link: ex.link,
                            createdAt: ex.createdAt,
                          }}
                          solved={solved.has(ex.problemId)}
                          solvers={solvers.get(ex.problemId) ?? []}
                          myId={myId}
                          isBookmarked={bookmarkedIds.has(ex.problemId)}
                          onToggleBookmark={toggleBookmark}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs">
          {/* Summary text */}
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="font-semibold text-slate-800">{startItem}</span> to{' '}
            <span className="font-semibold text-slate-800">{endItem}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalCount}</span> exercises
          </p>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="btn-ghost text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              ← Previous
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, idx) => {
                // Display limited page numbers if there are too many pages
                if (totalPages > 7) {
                  if (idx !== 0 && idx !== totalPages - 1 && Math.abs(idx - safePage) > 1) {
                    if (idx === 1 || idx === totalPages - 2) {
                      return <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>;
                    }
                    return null;
                  }
                }

                const isActive = idx === safePage;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPage(idx)}
                    className={`h-7 w-7 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-a2sv-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={safePage + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="btn-ghost text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}