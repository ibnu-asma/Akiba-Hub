'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import type { AttendanceRow, GroupSessionItem, GroupProgressSummary } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function Avatar({ name, url, size = 'h-6 w-6 text-[10px]' }: { name: string; url?: string | null; size?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${size} shrink-0 rounded-full object-cover border border-white shadow-xs`} />;
  }
  return (
    <span
      className={`${size} grid shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800 border border-white shadow-xs`}
    >
      {initials(name)}
    </span>
  );
}

const SORT_OPTIONS = [
  { value: 'presentPct_desc', label: 'Highest Attendance %' },
  { value: 'presentPct_asc', label: 'Lowest Attendance %' },
  { value: 'present_desc', label: 'Most Present Sessions' },
  { value: 'absent_desc', label: 'Most Absents (At Risk)' },
  { value: 'name_asc', label: 'Student Name (A-Z)' },
  { value: 'name_desc', label: 'Student Name (Z-A)' },
];

const TRACK_OPTIONS = [
  { value: 'all', label: 'All Tracks & Phases' },
  { value: 'python', label: 'Python Track' },
  { value: 'phase1', label: 'Education Phase I' },
  { value: 'camp1', label: 'Camp I' },
  { value: 'phase2', label: 'Education Phase II' },
  { value: 'camp2', label: 'Camp II' },
];

export function AttendanceDataTable({
  attendance,
  attendanceSessions,
  sessionStatusByStudent,
  summary,
}: {
  attendance: AttendanceRow[];
  attendanceSessions: GroupSessionItem[];
  sessionStatusByStudent: Record<string, Record<string, string>>;
  summary: GroupProgressSummary;
}) {
  // View mode: 'matrix' (Image 1 Heatmap) vs 'table' (Aggregated stats table)
  const [viewMode, setViewMode] = useState<'matrix' | 'table'>('matrix');

  // Filter and Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('presentPct_desc');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Horizontal window / pagination for sessions
  const [sessionWindow, setSessionWindow] = useState(0);
  const sessionsPerWindow = 14;

  // Derive unique months from sessions
  const monthOptions = useMemo(() => {
    const months = new Map<string, string>();
    for (const s of attendanceSessions) {
      const yearMonth = s.date.slice(0, 7); // '2026-10'
      if (!months.has(yearMonth)) {
        const d = new Date(s.date);
        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        months.set(yearMonth, label);
      }
    }
    return [
      { value: 'all', label: 'All Months' },
      ...Array.from(months.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [attendanceSessions]);

  // Filter sessions by Month and Track (if track name is in session name)
  const filteredSessions = useMemo(() => {
    return attendanceSessions.filter((s) => {
      // Month filter
      if (selectedMonth !== 'all' && !s.date.startsWith(selectedMonth)) {
        return false;
      }
      // Track filter
      if (selectedTrack !== 'all') {
        const name = (s.name || '').toLowerCase();
        if (selectedTrack === 'python' && !name.includes('python')) return false;
        if (selectedTrack === 'phase1' && !name.includes('phase i') && !name.includes('phase 1')) return false;
        if (selectedTrack === 'camp1' && !name.includes('camp i') && !name.includes('camp 1')) return false;
        if (selectedTrack === 'phase2' && !name.includes('phase ii') && !name.includes('phase 2')) return false;
        if (selectedTrack === 'camp2' && !name.includes('camp ii') && !name.includes('camp 2')) return false;
      }
      return true;
    });
  }, [attendanceSessions, selectedMonth, selectedTrack]);

  // Total session windows
  const totalWindows = Math.max(1, Math.ceil(filteredSessions.length / sessionsPerWindow));
  const safeWindow = Math.min(sessionWindow, totalWindows - 1);

  // Visible sessions in current horizontal slice
  const visibleSessions = useMemo(() => {
    const start = safeWindow * sessionsPerWindow;
    return filteredSessions.slice(start, start + sessionsPerWindow);
  }, [filteredSessions, safeWindow, sessionsPerWindow]);

  // Filter and Sort Students
  const processedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return attendance
      .filter((st) => {
        if (!q) return true;
        return st.name.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'presentPct_desc') {
          return b.presentPct - a.presentPct || b.present - a.present || a.name.localeCompare(b.name);
        }
        if (sortBy === 'presentPct_asc') {
          return a.presentPct - b.presentPct || a.present - b.present || a.name.localeCompare(b.name);
        }
        if (sortBy === 'present_desc') {
          return b.present - a.present || b.presentPct - a.presentPct || a.name.localeCompare(b.name);
        }
        if (sortBy === 'absent_desc') {
          return b.absent - a.absent || a.presentPct - b.presentPct || a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        return 0;
      });
  }, [attendance, searchQuery, sortBy]);

  // Dynamic summary stats for the filtered student roster
  const filteredPresent = processedStudents.reduce((sum, s) => sum + s.present, 0);
  const filteredAbsent = processedStudents.reduce((sum, s) => sum + s.absent, 0);
  const filteredExcused = processedStudents.reduce((sum, s) => sum + s.excused, 0);
  const filteredTotal = filteredPresent + filteredAbsent + filteredExcused;
  const filteredPresentPct = filteredTotal ? Math.round((filteredPresent / filteredTotal) * 100) : 0;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
      {/* Top Filter Bar: Student Search, Track, Month, Sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
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
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Track Filter */}
        <div className="min-w-[150px]">
          <select
            value={selectedTrack}
            onChange={(e) => {
              setSelectedTrack(e.target.value);
              setSessionWindow(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-500 cursor-pointer"
          >
            {TRACK_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
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
              setSessionWindow(0);
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

        {/* Sort Dropdown */}
        <div className="min-w-[170px]">
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

      {/* Header & Stats Banner (Matching Image 1) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 pt-1">
        <div>
          <h2 className="text-base font-bold text-slate-900">Legacy Attendance Summary</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Absents: <span className="text-rose-600 font-semibold">{filteredAbsent}</span> | Excuses:{' '}
            <span className="text-amber-600 font-semibold">{filteredExcused}</span> | Present:{' '}
            <span className="text-emerald-600 font-semibold">
              {filteredPresent} ({filteredPresentPct}%)
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Switch Attendance Mode Button */}
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === 'matrix' ? 'table' : 'matrix'))}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <Icon name="sliders" className="h-3.5 w-3.5 text-emerald-600" />
            <span>Switch to {viewMode === 'matrix' ? 'Detailed Table' : 'Session Matrix'}</span>
          </button>

          {/* Horizontal Session Windowing Controls (in Matrix mode) */}
          {viewMode === 'matrix' && totalWindows > 1 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <button
                type="button"
                disabled={safeWindow === 0}
                onClick={() => setSessionWindow((w) => Math.max(0, w - 1))}
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Earlier sessions"
              >
                <Icon name="chevronRight" className="h-3.5 w-3.5 rotate-180" />
              </button>
              <span className="px-1 text-[11px] font-bold text-slate-700">
                Showing: {safeWindow + 1}/{totalWindows}
              </span>
              <button
                type="button"
                disabled={safeWindow >= totalWindows - 1}
                onClick={() => setSessionWindow((w) => Math.min(totalWindows - 1, w + 1))}
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Later sessions"
              >
                <Icon name="chevronRight" className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: MATRIX VIEW WITH STICKY FROZEN COLUMNS (Image 1)             */}
      {/* ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="relative overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs max-h-[620px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/90 backdrop-blur-xs sticky top-0 z-30 shadow-xs">
              <tr className="border-b border-slate-200 text-slate-500 font-bold">
                {/* Frozen Rank Column */}
                <th className="sticky left-0 bg-slate-50 z-40 py-2.5 px-3 w-10 text-center border-r border-slate-200/80 shadow-[1px_0_0_0_#e2e8f0]">
                  #
                </th>
                {/* Frozen Student Column */}
                <th className="sticky left-10 bg-slate-50 z-40 py-2.5 px-3 min-w-[190px] border-r border-slate-200/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.07)]">
                  Student
                </th>
                {/* Dynamic Session Date Columns */}
                {visibleSessions.length === 0 ? (
                  <th className="py-2.5 px-4 text-center text-slate-400">No sessions match current filter</th>
                ) : (
                  visibleSessions.map((s) => {
                    const d = s.date.slice(5).replace('-', '.');
                    return (
                      <th
                        key={s.id}
                        className="py-2 px-1 text-center min-w-[54px] max-w-[64px] border-r border-slate-100 font-medium"
                        title={`${s.name} (${s.date})`}
                      >
                        <div className="text-[10px] font-bold text-slate-800 leading-tight">{d}</div>
                        <div className="text-[9px] text-slate-400 font-mono">{s.startTime ?? '09:00'}</div>
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {processedStudents.length === 0 ? (
                <tr>
                  <td colSpan={visibleSessions.length + 2} className="py-12 text-center text-xs text-slate-400">
                    No students match your query.
                  </td>
                </tr>
              ) : (
                processedStudents.map((student, idx) => {
                  return (
                    <tr key={student.userId} className="group hover:bg-emerald-50/20 transition">
                      {/* Frozen Rank Column Cell */}
                      <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-20 py-2 px-3 text-center font-bold text-slate-400 border-r border-slate-200/80 shadow-[1px_0_0_0_#e2e8f0]">
                        {idx + 1}
                      </td>

                      {/* Frozen Student Column Cell */}
                      <td className="sticky left-10 bg-white group-hover:bg-slate-50 z-20 py-2 px-3 border-r border-slate-200/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.07)]">
                        <Link
                          href={`/profile?userId=${student.userId}`}
                          className="flex items-center gap-2 hover:text-emerald-700 transition"
                        >
                          <Avatar name={student.name} url={student.avatarUrl} size="h-6 w-6 text-[10px]" />
                          <span className="font-bold text-slate-900 truncate max-w-[110px]">{student.name}</span>
                          <span className="text-[10px] font-medium text-slate-400 shrink-0">
                            ({student.present} | {student.presentPct}%)
                          </span>
                        </Link>
                      </td>

                      {/* Session Cells */}
                      {visibleSessions.length === 0 ? (
                        <td className="py-2 px-4 text-center text-slate-300">—</td>
                      ) : (
                        visibleSessions.map((s) => {
                          const status = sessionStatusByStudent[student.userId]?.[s.id];
                          let bg = 'bg-slate-100';
                          let title = 'Unmarked';
                          if (status === 'present') {
                            bg = 'bg-[#22c55e]';
                            title = 'Present';
                          } else if (status === 'excused' || status === 'late') {
                            bg = 'bg-[#f59e0b]';
                            title = status === 'late' ? 'Late' : 'Excused';
                          } else if (status === 'absent') {
                            bg = 'bg-[#ef4444]';
                            title = 'Absent';
                          }
                          return (
                            <td key={s.id} className="py-2 px-1 text-center border-r border-slate-100/60">
                              <span
                                className={`inline-block h-3.5 w-10 rounded-xs shadow-2xs transition-transform group-hover:scale-105 cursor-pointer ${bg}`}
                                title={`${student.name} - ${s.name} (${s.date} ${s.startTime || ''}): ${title}`}
                              />
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: DETAILED AGGREGATED DATA TABLE                               */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[180px]">Student</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 min-w-[160px]">Attendance Rate</th>
                <th className="py-3 px-3 text-center text-emerald-700">Present</th>
                <th className="py-3 px-3 text-center text-rose-600">Absent</th>
                <th className="py-3 px-3 text-center text-amber-600">Excused</th>
                <th className="py-3 px-3 text-center text-orange-600">Late</th>
                <th className="py-3 px-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {processedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-slate-400">
                    No students found.
                  </td>
                </tr>
              ) : (
                processedStudents.map((st, idx) => {
                  const isHigh = st.presentPct >= 85;
                  const isModerate = st.presentPct >= 70 && st.presentPct < 85;

                  return (
                    <tr key={st.userId} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/profile?userId=${st.userId}`}
                          className="flex items-center gap-2.5 hover:text-emerald-700 transition"
                        >
                          <Avatar name={st.name} url={st.avatarUrl} size="h-7 w-7 text-xs" />
                          <div>
                            <p className="font-bold text-slate-900">{st.name}</p>
                            <p className="text-[10px] text-slate-400">Student</p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        {isHigh ? (
                          <span className="chip bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                            ● Good Standing
                          </span>
                        ) : isModerate ? (
                          <span className="chip bg-amber-50 text-amber-800 text-[10px] font-bold">
                            ● Average
                          </span>
                        ) : (
                          <span className="chip bg-rose-50 text-rose-800 text-[10px] font-bold">
                            ● Needs Support
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-900">{st.presentPct}%</span>
                            <span className="text-slate-400 text-[10px] font-normal">
                              {st.present}/{st.total} sessions
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isHigh ? 'bg-emerald-500' : isModerate ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${st.presentPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">{st.present}</td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600">{st.absent}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600">{st.excused}</td>
                      <td className="py-3 px-3 text-center font-bold text-orange-600">{st.late}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{st.total}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Color Legend & Help Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#22c55e]" /> Present
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#f59e0b]" /> Excused / Late
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#ef4444]" /> Absent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-slate-100" /> Unmarked / No Session
          </span>
        </div>

        <p className="text-slate-400 text-[10px]">
          Tip: Table is horizontally scrollable. Use &lt; &gt; buttons to navigate session periods.
        </p>
      </div>
    </section>
  );
}

