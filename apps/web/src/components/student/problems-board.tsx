'use client';

import { useState, useMemo, useEffect } from 'react';
import { Icon } from '@/components/icon';
import { ProblemSolveCard } from '@/components/student/problem-solve-card';
import type { ProblemDto } from '@/lib/api';
import type { Solver } from '@/lib/student';

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
  { value: 'bookmarked', label: 'Bookmarked' },
];

const PAGE_SIZES = [
  { value: '10', label: '10 per page' },
  { value: '20', label: '20 per page' },
  { value: '50', label: '50 per page' },
  { value: 'all', label: 'All problems' },
];

/**
 * Student Problems — shared problem catalog with modern search/filtering,
 * newest problems first, solved highlighting, and pagination (SPEC §6.3).
 */
export function ProblemsBoard({
  problems,
  solved,
  solvers,
  myId,
  isHead,
}: {
  problems: ProblemDto[];
  solved: Set<string>;
  solvers: Map<string, Solver[]>;
  myId?: string;
  isHead?: boolean;
}) {
  // Filter States
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);

  // Pagination States
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState('20');

  // Bookmarks state (synchronized with localStorage)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem('hub_bookmarked_problems');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

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

  // Dynamic platforms from problems
  const platformOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of problems) {
      if (p.platform) set.add(p.platform.toLowerCase());
    }
    return [
      { value: ALL, label: 'All Platforms' },
      ...Array.from(set).map((plat) => ({
        value: plat,
        label: plat.charAt(0).toUpperCase() + plat.slice(1),
      })),
    ];
  }, [problems]);

  // Reset page to 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [q, diff, status, platform, pageSize]);

  // Filter and sort problems: Newest problems on top
  const filteredProblems = useMemo(() => {
    const query = q.trim().toLowerCase();

    return problems
      .filter((p) => {
        // Search query: problem name or tags
        if (query) {
          const matchName = p.name.toLowerCase().includes(query);
          const matchTag = p.tags?.some((t) => t.toLowerCase().includes(query));
          if (!matchName && !matchTag) return false;
        }

        // Difficulty filter
        if (diff !== ALL && p.difficulty.toLowerCase() !== diff.toLowerCase()) {
          return false;
        }

        // Status filter
        const isProbSolved = solved.has(p.id) || (Boolean(isHead) && (solvers.get(p.id)?.length ?? 0) > 0);
        if (status === 'solved' && !isProbSolved) return false;
        if (status === 'unsolved' && isProbSolved) return false;
        if (status === 'bookmarked' && !bookmarkedIds.has(p.id)) return false;

        // Platform filter
        if (platform !== ALL && p.platform.toLowerCase() !== platform.toLowerCase()) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort newest added problem to the top (descending createdAt)
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.name.localeCompare(b.name);
      });
  }, [problems, q, diff, status, platform, solved, solvers, bookmarkedIds, isHead]);

  // Pagination calculations
  const totalCount = filteredProblems.length;
  const sizeNum = pageSize === 'all' ? totalCount : Number.parseInt(pageSize, 10);
  const totalPages = sizeNum > 0 ? Math.ceil(totalCount / sizeNum) : 1;
  const safePage = Math.min(page, Math.max(0, totalPages - 1));

  const pagedProblems = useMemo(() => {
    if (pageSize === 'all') return filteredProblems;
    const start = safePage * sizeNum;
    return filteredProblems.slice(start, start + sizeNum);
  }, [filteredProblems, safePage, sizeNum, pageSize]);

  const solvedCount = problems.filter((p) => solved.has(p.id) || (Boolean(isHead) && (solvers.get(p.id)?.length ?? 0) > 0)).length;
  const bookmarkedCount = problems.filter((p) => bookmarkedIds.has(p.id)).length;

  const hasActiveFilters = q.trim() !== '' || diff !== ALL || status !== ALL || platform !== ALL;
  const resetFilters = () => {
    setQ('');
    setDiff(ALL);
    setStatus(ALL);
    setPlatform(ALL);
  };

  const startItem = totalCount === 0 ? 0 : safePage * sizeNum + 1;
  const endItem = pageSize === 'all' ? totalCount : Math.min((safePage + 1) * sizeNum, totalCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Problems</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isHead 
              ? `The shared problem library — ${problems.length} problems total. Curate the DSA library or browse problems.`
              : `The shared problem library — ${problems.length} problems, ${solvedCount} solved by you. Open the judge link or log your solution.`}
          </p>
        </div>

        {/* Header Stats / Actions */}
        {isHead ? (
          <div className="flex items-center gap-2 shrink-0">
            <a href="/problems/new" className="btn-primary py-2 px-4 text-sm shadow-sm">
              + Add Problem
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="chip bg-slate-100 text-slate-700 text-xs font-semibold">
              {problems.length} total
            </span>
            <span className="chip bg-emerald-100 text-emerald-800 text-xs font-semibold">
              {solvedCount} solved
            </span>
            {bookmarkedCount > 0 && (
              <span className="chip bg-amber-100 text-amber-800 text-xs font-semibold">
                {bookmarkedCount} saved
              </span>
            )}
          </div>
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
            placeholder="Search problems by name or tags…"
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
            {totalCount} {totalCount === 1 ? 'problem' : 'problems'} found
          </span>
        </div>
      </section>

      {/* Empty State */}
      {totalCount === 0 ? (
        <section className="card p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-4xl">📚</p>
          <h3 className="mt-3 text-base font-bold text-slate-900">
            {problems.length === 0 ? 'No problems yet' : 'No problems match your search'}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {problems.length === 0
              ? 'Your head of education will add some DSA problems soon.'
              : 'Try adjusting your keywords, difficulty, or platform filters.'}
          </p>
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
        /* Problem Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagedProblems.map((problem) => (
            <ProblemSolveCard
              key={problem.id}
              problem={{
                id: problem.id,
                name: problem.name,
                difficulty: problem.difficulty,
                platform: problem.platform,
                tags: problem.tags ?? [],
                link: problem.link,
                createdAt: problem.createdAt,
              }}
              solved={solved.has(problem.id)}
              solvers={solvers.get(problem.id) ?? []}
              myId={myId}
              isBookmarked={bookmarkedIds.has(problem.id)}
              onToggleBookmark={toggleBookmark}
              isHead={isHead}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs">
          {/* Summary text */}
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="font-semibold text-slate-800">{startItem}</span> to{' '}
            <span className="font-semibold text-slate-800">{endItem}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalCount}</span> problems
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