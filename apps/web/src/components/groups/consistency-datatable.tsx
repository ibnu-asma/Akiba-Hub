'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import type { ConsistencyRow, GroupProgressSummary } from '@/lib/api';

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
  { value: 'solves_desc', label: 'Highest Total Solves' },
  { value: 'solves_asc', label: 'Lowest Total Solves' },
  { value: 'consistency_desc', label: 'Highest Consistency %' },
  { value: 'streak_desc', label: 'Longest Streak' },
  { value: 'activeDays_desc', label: 'Most Active Days' },
  { value: 'name_asc', label: 'Student Name (A-Z)' },
  { value: 'name_desc', label: 'Student Name (Z-A)' },
];

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All Recorded Dates' },
  { value: 'past14', label: 'Past 14 Days' },
  { value: 'past30', label: 'Past 30 Days' },
  { value: 'past60', label: 'Past 60 Days' },
];

interface ComputedStudentConsistency {
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalSolves: number;
  activeDays: number;
  targetDays: number;
  pct: number;
  currentStreak: number;
  maxStreak: number;
  avgPerActiveDay: string;
  dayMap: Map<string, number>;
}

export function ConsistencyDataTable({
  consistency,
  summary,
}: {
  consistency: ConsistencyRow[];
  summary: GroupProgressSummary;
}) {
  // View mode: 'matrix' (Image 2 Heatmap) vs 'table' (Aggregated stats breakdown)
  const [viewMode, setViewMode] = useState<'matrix' | 'table'>('matrix');

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('solves_desc');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Horizontal window / pagination for dates in matrix mode
  const [dateWindow, setDateWindow] = useState(0);
  const [expandAllDates, setExpandAllDates] = useState(false);
  const datesPerWindow = 28;

  // 1. Build comprehensive chronological timeline of dates
  const fullTimeline = useMemo(() => {
    const datesSet = new Set<string>();
    for (const r of consistency) {
      for (const d of r.days) {
        datesSet.add(d.day);
      }
    }

    if (datesSet.size === 0) {
      // If no submissions recorded yet, generate a realistic 30-day timeline ending today
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        datesSet.add(d.toISOString().slice(0, 10));
      }
    } else {
      // If dates exist, fill in any missing consecutive calendar days between min and max
      const sortedDates = Array.from(datesSet).sort();
      const minDate = new Date(sortedDates[0]);
      const maxDate = new Date(sortedDates[sortedDates.length - 1]);
      const cur = new Date(minDate);
      while (cur <= maxDate) {
        datesSet.add(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Sort ascending for streaks, descending for column display
    return Array.from(datesSet).sort();
  }, [consistency]);

  // Ascending dates (earliest to latest) for streak calculations
  const datesAsc = useMemo(() => [...fullTimeline].sort(), [fullTimeline]);

  // Derive unique months for the month filter dropdown
  const monthOptions = useMemo(() => {
    const months = new Map<string, string>();
    for (const dateStr of fullTimeline) {
      const yearMonth = dateStr.slice(0, 7); // '2026-08'
      if (!months.has(yearMonth)) {
        const d = new Date(dateStr);
        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        months.set(yearMonth, label);
      }
    }
    return [
      { value: 'all', label: 'All Months' },
      ...Array.from(months.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [fullTimeline]);

  // Filtered timeline based on Period & Month filters, ordered reverse-chronologically (newest on left)
  const filteredTimeline = useMemo(() => {
    let dates = [...fullTimeline].reverse();

    if (selectedMonth !== 'all') {
      dates = dates.filter((d) => d.startsWith(selectedMonth));
    }

    if (selectedPeriod === 'past14') {
      dates = dates.slice(0, 14);
    } else if (selectedPeriod === 'past30') {
      dates = dates.slice(0, 30);
    } else if (selectedPeriod === 'past60') {
      dates = dates.slice(0, 60);
    }

    return dates;
  }, [fullTimeline, selectedMonth, selectedPeriod]);

  // Horizontal windowing for matrix mode
  const totalWindows = Math.max(1, Math.ceil(filteredTimeline.length / datesPerWindow));
  const safeWindow = Math.min(dateWindow, totalWindows - 1);

  const visibleDates = useMemo(() => {
    if (expandAllDates) {
      return filteredTimeline;
    }
    const start = safeWindow * datesPerWindow;
    return filteredTimeline.slice(start, start + datesPerWindow);
  }, [filteredTimeline, safeWindow, datesPerWindow, expandAllDates]);

  // 2. Precompute student metrics: dayMap, current streak, max streak, consistency pct
  const computedStudents = useMemo(() => {
    const timelineLen = Math.max(fullTimeline.length, 30);

    return consistency.map((row) => {
      const dayMap = new Map<string, number>();
      for (const d of row.days) {
        dayMap.set(d.day, d.count);
      }

      // Calculate max streak across all chronological days
      let maxStreak = 0;
      let tempStreak = 0;
      for (const dateStr of datesAsc) {
        const count = dayMap.get(dateStr) ?? 0;
        if (count > 0) {
          tempStreak += 1;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }

      // Calculate current streak backward from latest date
      let currentStreak = 0;
      const reversedAsc = [...datesAsc].reverse();
      for (const dateStr of reversedAsc) {
        const count = dayMap.get(dateStr) ?? 0;
        if (count > 0) {
          currentStreak += 1;
        } else {
          break;
        }
      }

      // If maxStreak is 0 but activeDays > 0, fallback to activeDays
      if (maxStreak === 0 && row.activeDays > 0) {
        maxStreak = Math.max(1, row.activeDays);
      }

      // Target days represents total cohort tracking period or target solves
      const targetDays = Math.max(timelineLen, Math.max(20, row.totalSolves + 5));
      const pct = Math.min(100, Math.round((row.totalSolves / targetDays) * 100));
      const avgPerActiveDay = row.activeDays > 0 ? (row.totalSolves / row.activeDays).toFixed(1) : '0.0';

      return {
        userId: row.userId,
        name: row.name,
        avatarUrl: row.avatarUrl ?? null,
        totalSolves: row.totalSolves,
        activeDays: row.activeDays,
        targetDays,
        pct,
        currentStreak,
        maxStreak,
        avgPerActiveDay,
        dayMap,
      } as ComputedStudentConsistency;
    });
  }, [consistency, fullTimeline.length, datesAsc]);

  // 3. Filter and Sort Students
  const processedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return computedStudents
      .filter((st) => {
        if (!q) return true;
        return st.name.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'solves_desc') {
          return b.totalSolves - a.totalSolves || b.pct - a.pct || a.name.localeCompare(b.name);
        }
        if (sortBy === 'solves_asc') {
          return a.totalSolves - b.totalSolves || a.pct - b.pct || a.name.localeCompare(b.name);
        }
        if (sortBy === 'consistency_desc') {
          return b.pct - a.pct || b.totalSolves - a.totalSolves || a.name.localeCompare(b.name);
        }
        if (sortBy === 'streak_desc') {
          return b.maxStreak - a.maxStreak || b.currentStreak - a.currentStreak || b.totalSolves - a.totalSolves;
        }
        if (sortBy === 'activeDays_desc') {
          return b.activeDays - a.activeDays || b.totalSolves - a.totalSolves;
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        return 0;
      });
  }, [computedStudents, searchQuery, sortBy]);

  // Group consistency KPI summaries for the filtered roster
  const filteredSolves = processedStudents.reduce((sum, s) => sum + s.totalSolves, 0);
  const filteredActiveStudents = processedStudents.filter((s) => s.totalSolves > 0).length;
  const filteredAvgPct =
    processedStudents.length > 0
      ? Math.round(processedStudents.reduce((sum, s) => sum + s.pct, 0) / processedStudents.length)
      : 0;
  const maxGroupStreak =
    processedStudents.length > 0 ? Math.max(...processedStudents.map((s) => s.maxStreak)) : 0;
  const cohortTargetDays =
    processedStudents.length > 0 ? Math.max(...processedStudents.map((s) => s.targetDays), 262) : 262;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
      {/* Top Filter Bar: Student Search, Period Filter, Month, Sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student in roster…"
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

        {/* Period Range Filter */}
        <div className="min-w-[150px]">
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setDateWindow(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 cursor-pointer"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div className="min-w-[140px]">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setDateWindow(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 cursor-pointer"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
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
      </div>

      {/* Header & Stats Banner (Matching Image 2 Spec) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-900">Consistency Summary</h2>
            <span className="chip bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/60">
              {filteredSolves} solves total
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Active: <span className="text-emerald-700 font-semibold">{filteredActiveStudents}/{processedStudents.length}</span> students · Avg Consistency:{' '}
            <span className="text-blue-600 font-semibold">{filteredAvgPct}%</span> · Top Streak:{' '}
            <span className="text-amber-600 font-semibold">{maxGroupStreak} days</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch Mode Button */}
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'matrix' ? 'table' : 'matrix'))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <Icon name="sliders" className="h-3.5 w-3.5 text-emerald-600" />
            <span>Switch to {viewMode === 'matrix' ? 'Detailed Table' : 'Heatmap Matrix'}</span>
          </button>

          {/* Matrix Window Navigation Controls */}
          {viewMode === 'matrix' && !expandAllDates && totalWindows > 1 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <button
                type="button"
                disabled={safeWindow >= totalWindows - 1}
                onClick={() => setDateWindow((w) => Math.min(totalWindows - 1, w + 1))}
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Earlier dates"
              >
                <Icon name="chevronRight" className="h-3.5 w-3.5 rotate-180" />
              </button>
              <span className="px-1 text-[11px] font-bold text-slate-700">
                Showing: {safeWindow + 1}/{totalWindows}
              </span>
              <button
                type="button"
                disabled={safeWindow === 0}
                onClick={() => setDateWindow((w) => Math.max(0, w - 1))}
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Later dates"
              >
                <Icon name="chevronRight" className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Toggle Expand / Windowed View */}
          {viewMode === 'matrix' && filteredTimeline.length > datesPerWindow && (
            <button
              type="button"
              onClick={() => setExpandAllDates((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title={expandAllDates ? 'Window to slices' : 'Show all dates in one wide scroll'}
            >
              <span>{expandAllDates ? 'Windowed' : 'View All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: MATRIX HEATMAP VIEW WITH STICKY COLUMNS (Image 2 Replica)     */}
      {/* ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="relative overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs max-h-[640px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/95 backdrop-blur-xs sticky top-0 z-30 shadow-xs">
              <tr className="border-b border-slate-200 text-slate-500 font-bold">
                {/* Frozen Rank Column */}
                <th className="sticky left-0 bg-slate-50 z-40 py-2 px-2.5 w-9 text-center border-r border-slate-200/80 shadow-[1px_0_0_0_#e2e8f0]">
                  #
                </th>

                {/* Frozen Student Column (Streak, Avatar, Name, Solves) */}
                <th className="sticky left-9 bg-slate-50 z-40 py-2 px-3 min-w-[240px] max-w-[270px] border-r border-slate-200/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.07)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Student</span>
                    {/* Visual match to Image 2: top number & day.month label */}
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-800 leading-none">{cohortTargetDays}</span>
                      <p className="text-[9px] font-mono text-slate-400 leading-none">day.month</p>
                    </div>
                  </div>
                </th>

                {/* Dynamic Date Columns (Formatted day.month e.g. 23.8, 22.8) */}
                {visibleDates.length === 0 ? (
                  <th className="py-2.5 px-4 text-center text-slate-400">No dates match current filter</th>
                ) : (
                  visibleDates.map((dateStr) => {
                    const [, m, d] = dateStr.split('-');
                    return (
                      <th
                        key={dateStr}
                        className="py-2 px-1 text-center min-w-[32px] max-w-[36px] font-medium"
                        title={dateStr}
                      >
                        <span className="text-[10px] font-bold text-slate-600 block">
                          {Number(d)}.{Number(m)}
                        </span>
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {processedStudents.length === 0 ? (
                <tr>
                  <td colSpan={visibleDates.length + 2} className="py-12 text-center text-xs text-slate-400">
                    No students match your query.
                  </td>
                </tr>
              ) : (
                processedStudents.map((student, idx) => {
                  return (
                    <tr key={student.userId} className="group hover:bg-slate-50/60 transition">
                      {/* Frozen Rank Column */}
                      <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-20 py-1.5 px-2.5 text-center font-bold text-slate-400 border-r border-slate-200/80 shadow-[1px_0_0_0_#e2e8f0]">
                        {idx + 1}
                      </td>

                      {/* Frozen Student Info Column (💧 Streak, Avatar, Name, (solves/target | pct%)) */}
                      <td className="sticky left-9 bg-white group-hover:bg-slate-50 z-20 py-1.5 px-3 border-r border-slate-200/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.07)]">
                        <div className="flex items-center gap-2">
                          {/* Streak Badge */}
                          <span
                            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-600 shrink-0 select-none"
                            title={`Current streak: ${student.currentStreak}d | Longest streak: ${student.maxStreak}d`}
                          >
                            <span className="text-blue-500">💧</span>
                            <span>
                              {student.currentStreak}/{student.maxStreak || student.targetDays}
                            </span>
                          </span>

                          {/* Avatar */}
                          <Avatar name={student.name} url={student.avatarUrl} size="h-6 w-6 text-[10px]" />

                          {/* Student Name & Metrics (Exact match to Image 2) */}
                          <div className="min-w-0 flex items-baseline gap-1 truncate">
                            <Link
                              href={`/profile?userId=${student.userId}`}
                              className="font-bold text-slate-900 hover:text-emerald-700 transition truncate text-xs"
                              title={student.name}
                            >
                              {student.name}
                            </Link>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              ({student.totalSolves}/{student.targetDays} | {student.pct}%)
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Day Solve Cells */}
                      {visibleDates.map((dateStr) => {
                        const count = student.dayMap.get(dateStr) ?? 0;

                        // Precise color matching to Image 2:
                        // 0: Soft salmon / light pinkish red (no text)
                        // 1: Bright emerald green
                        // 2: Rich green
                        // 3: Warm amber / yellow
                        // 4-5: Vivid orange
                        // 6+: Royal blue
                        let bgClass = 'bg-[#fecaca] text-transparent hover:ring-2 hover:ring-rose-400';
                        if (count === 1) {
                          bgClass = 'bg-[#22c55e] text-white hover:ring-2 hover:ring-emerald-400';
                        } else if (count === 2) {
                          bgClass = 'bg-[#16a34a] text-white hover:ring-2 hover:ring-emerald-500';
                        } else if (count === 3) {
                          bgClass = 'bg-[#f59e0b] text-white hover:ring-2 hover:ring-amber-400';
                        } else if (count >= 4 && count < 6) {
                          bgClass = 'bg-[#ea580c] text-white hover:ring-2 hover:ring-orange-400';
                        } else if (count >= 6) {
                          bgClass = 'bg-[#3b82f6] text-white hover:ring-2 hover:ring-blue-400';
                        }

                        const [, m, d] = dateStr.split('-');
                        const tooltipText = `${student.name} · ${Number(d)}.${Number(m)} (${dateStr}): ${
                          count > 0 ? `${count} problem(s) solved` : 'Missed day (0 solves)'
                        }`;

                        return (
                          <td key={dateStr} className="py-1 px-0.5 text-center">
                            <span
                              className={`inline-grid place-items-center h-5 w-7 rounded-[3px] text-[10px] font-extrabold shadow-2xs transition-transform select-none cursor-pointer ${bgClass}`}
                              title={tooltipText}
                            >
                              {count > 0 ? count : ''}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: DETAILED PERFORMANCE TABLE VIEW                              */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 min-w-[200px]">Student</th>
                <th className="py-3 px-3 text-center">Total Solves</th>
                <th className="py-3 px-3 text-center">Active Days</th>
                <th className="py-3 px-3 min-w-[140px]">Consistency Rate</th>
                <th className="py-3 px-3 text-center">Current Streak</th>
                <th className="py-3 px-3 text-center">Longest Streak</th>
                <th className="py-3 px-3 text-center">Solves / Active Day</th>
                <th className="py-3 px-3 text-center">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {processedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                    No students match your query.
                  </td>
                </tr>
              ) : (
                processedStudents.map((student, idx) => {
                  let tierColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  let tierLabel = 'At Risk';
                  if (student.pct >= 80) {
                    tierColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    tierLabel = 'Consistent';
                  } else if (student.pct >= 50) {
                    tierColor = 'bg-blue-50 text-blue-700 border-blue-200';
                    tierLabel = 'Moderate';
                  }

                  return (
                    <tr key={student.userId} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <Link
                          href={`/profile?userId=${student.userId}`}
                          className="flex items-center gap-2 hover:text-emerald-700 transition"
                        >
                          <Avatar name={student.name} url={student.avatarUrl} size="h-7 w-7 text-xs" />
                          <span className="font-bold text-slate-900 truncate">{student.name}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-800">
                          {student.totalSolves}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                        {student.activeDays} days
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-700">{student.pct}%</span>
                            <span className="text-slate-400 font-normal">
                              {student.totalSolves}/{student.targetDays}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${student.pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-600">
                        💧 {student.currentStreak}d
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                        🔥 {student.maxStreak}d
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-600">
                        {student.avgPerActiveDay}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${tierColor}`}
                        >
                          {tierLabel}
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

      {/* Color Legend & Streaks Guide */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[11px] font-medium text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700">Solve Intensity:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-5 rounded-[2px] bg-[#fecaca] inline-block shadow-2xs" />
            <span>0 (Missed)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-5 rounded-[2px] bg-[#22c55e] inline-block shadow-2xs text-white text-[9px] font-bold grid place-items-center">
              1
            </span>
            <span>1 Solve</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-5 rounded-[2px] bg-[#16a34a] inline-block shadow-2xs text-white text-[9px] font-bold grid place-items-center">
              2
            </span>
            <span>2 Solves</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-5 rounded-[2px] bg-[#f59e0b] inline-block shadow-2xs text-white text-[9px] font-bold grid place-items-center">
              3
            </span>
            <span>3 Solves</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-5 rounded-[2px] bg-[#ea580c] inline-block shadow-2xs text-white text-[9px] font-bold grid place-items-center">
              4
            </span>
            <span>4–5 Solves</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-5 rounded-[2px] bg-[#3b82f6] inline-block shadow-2xs text-white text-[9px] font-bold grid place-items-center">
              6
            </span>
            <span>6+ Solves</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500 font-semibold">
          <span>💧 Current / Best Streak</span>
        </div>
      </div>
    </section>
  );
}

