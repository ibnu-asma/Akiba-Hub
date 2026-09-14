'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import type { GroupProgressData, GroupSessionItem } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function Avatar({ name, url, size = 'h-8 w-8 text-xs' }: { name: string; url?: string | null; size?: string }) {
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

const TABS = [
  { key: 'summary', label: 'Summary', icon: 'chart' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar' },
  { key: 'consistency', label: 'Consistency', icon: 'sparkles' },
  { key: 'completion', label: 'Completion', icon: 'checkCircle' },
  { key: 'exercise', label: 'Exercise', icon: 'code' },
  { key: 'upsolving', label: 'Upsolving', icon: 'trophy' },
  { key: 'divisions', label: 'Divisions', icon: 'shield' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function GroupProgressView({ progress }: { progress: GroupProgressData }) {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const { group, summary, attendance, attendanceSessions, sessionStatusByStudent, consistency, completion, exercise, upsolving, divisions } = progress;

  // Selected contest for Upsolving tab
  const [selectedContestId, setSelectedContestId] = useState<string>(() => {
    return upsolving.contests.length > 0 ? upsolving.contests[0].id : '';
  });

  // Selected contest object
  const activeContest = useMemo(() => {
    return upsolving.contests.find((c) => c.id === selectedContestId) ?? upsolving.contests[0];
  }, [upsolving.contests, selectedContestId]);

  // Attendance pagination / mode state
  const [attPage, setAttPage] = useState(0);
  const attSessionsPerPage = 12;
  const totalAttPages = Math.max(1, Math.ceil(attendanceSessions.length / attSessionsPerPage));
  const visibleSessions = useMemo(() => {
    const start = attPage * attSessionsPerPage;
    return attendanceSessions.slice(start, start + attSessionsPerPage);
  }, [attendanceSessions, attPage]);

  // Exercise progress filter
  const [exerciseFilter, setExerciseFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [showDetailCompletion, setShowDetailCompletion] = useState(true);

  // Consistency dates (last 24 days or available days)
  const consistencyDates = useMemo(() => {
    const datesSet = new Set<string>();
    for (const r of consistency) {
      for (const d of r.days) {
        datesSet.add(d.day);
      }
    }
    // If few dates, generate a sensible timeline
    if (datesSet.size === 0) {
      const today = new Date();
      for (let i = 23; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        datesSet.add(d.toISOString().slice(0, 10));
      }
    }
    return Array.from(datesSet).sort().reverse().slice(0, 24);
  }, [consistency]);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition"
        >
          <Icon name="chevronRight" className="h-4 w-4 rotate-180" />
          <span>Back to Groups</span>
        </Link>
      </div>

      {/* Group Header Hero Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500 text-xl font-black text-white shadow-xs">
              {group.shortName}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{group.name}</h1>
                {group.superGroupName && (
                  <span className="chip bg-slate-100 text-slate-700 text-xs font-semibold">
                    {group.superGroupName}
                  </span>
                )}
                {group.country && (
                  <span className="chip bg-emerald-50 text-emerald-800 text-xs font-semibold">
                    🌍 {group.country}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {group.studentCount} active student{group.studentCount === 1 ? '' : 's'}
                {group.heads.length > 0 ? ` · Mentored by ${group.heads.map((h) => h.name).join(', ')}` : ''}
              </p>
              {group.description && (
                <p className="mt-2 text-xs text-slate-600 max-w-2xl leading-relaxed">{group.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {group.heads.map((h) => (
              <span key={h.id} className="inline-flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5 text-xs font-medium text-slate-700">
                <Icon name="shield" className="h-3.5 w-3.5 text-emerald-600" />
                <span>{h.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 7-Tab Sub-Navigation */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <nav className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon name={t.icon as any} className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* TAB 1: SUMMARY                                                            */}
      {/* ========================================================================= */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Roster Size</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{summary.studentCount}</p>
              <p className="mt-1 text-xs text-slate-500">Active students in group</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance Rate</p>
              <p className="mt-2 text-3xl font-extrabold text-emerald-600">{summary.overallPresentPct}%</p>
              <p className="mt-1 text-xs text-slate-500">
                {summary.totalPresent} present · {summary.totalAbsent} absent
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Solves</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{summary.totalSolves}</p>
              <p className="mt-1 text-xs text-slate-500">Avg {summary.avgSolves} problems per student</p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Track Completion</p>
              <p className="mt-2 text-3xl font-extrabold text-blue-600">{summary.avgCompletionPct}%</p>
              <p className="mt-1 text-xs text-slate-500">{summary.avgCompleted} of {summary.totalExercises} exercises avg</p>
            </div>
          </div>

          {/* Quick Roster & Status */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Enrolled Students ({group.students.length})</h2>
              <span className="text-xs text-slate-400">Click any student to view public profile</span>
            </div>

            {group.students.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No students enrolled in this group yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.students.map((student) => (
                  <li key={student.id}>
                    <Link
                      href={`/profile?userId=${student.id}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3 hover:border-emerald-300 hover:bg-emerald-50/20 transition group"
                    >
                      <Avatar name={student.name} url={student.avatarUrl} size="h-10 w-10 text-xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          {student.name}
                        </p>
                        <p className="text-[11px] text-slate-400">Student</p>
                      </div>
                      <Icon name="chevronRight" className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ATTENDANCE (Matches Image 1)                                       */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          {/* Header & Stats Banner (Matching Image 1) */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Legacy Attendance Summary</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Absents: <span className="text-rose-600 font-semibold">{summary.totalAbsent}</span> | Excuses:{' '}
                <span className="text-amber-600 font-semibold">{summary.totalExcused}</span> | Present:{' '}
                <span className="text-emerald-600 font-semibold">
                  {summary.totalPresent} ({summary.overallPresentPct}%)
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Switch Attendance Mode
              </button>

              {totalAttPages > 1 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <button
                    type="button"
                    disabled={attPage === 0}
                    onClick={() => setAttPage((p) => Math.max(0, p - 1))}
                    className="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Previous sessions"
                  >
                    <Icon name="chevronRight" className="h-3.5 w-3.5 rotate-180" />
                  </button>
                  <span>
                    Showing: {attPage + 1}/{totalAttPages}
                  </span>
                  <button
                    type="button"
                    disabled={attPage >= totalAttPages - 1}
                    onClick={() => setAttPage((p) => Math.min(totalAttPages - 1, p + 1))}
                    className="rounded-lg border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next sessions"
                  >
                    <Icon name="chevronRight" className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* High-Density Session Attendance Grid (Matching Image 1) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Student</th>
                  {visibleSessions.length === 0 ? (
                    <th className="py-2.5 px-3 text-center">Sessions</th>
                  ) : (
                    visibleSessions.map((s) => {
                      const d = s.date.slice(5).replace('-', '.');
                      return (
                        <th key={s.id} className="py-2.5 px-1.5 text-center min-w-[56px]" title={`${s.name} (${s.date})`}>
                          <div className="text-[10px] leading-tight text-slate-700">{d}</div>
                          <div className="text-[9px] font-normal text-slate-400">{s.startTime ?? '09:00'}</div>
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-xs text-slate-400">
                      No attendance records logged yet.
                    </td>
                  </tr>
                ) : (
                  attendance.map((student, idx) => {
                    return (
                      <tr key={student.userId} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <Link
                            href={`/profile?userId=${student.userId}`}
                            className="flex items-center gap-2 hover:text-emerald-700 transition"
                          >
                            <Avatar name={student.name} url={student.avatarUrl} size="h-6 w-6 text-[10px]" />
                            <span className="font-bold text-slate-800 truncate max-w-[120px]">{student.name}</span>
                            <span className="text-[10px] font-medium text-slate-400">
                              ({student.present} | {student.presentPct}%)
                            </span>
                          </Link>
                        </td>

                        {visibleSessions.length === 0 ? (
                          <td className="py-2 px-3 text-center text-slate-400">—</td>
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
                              <td key={s.id} className="py-2 px-1 text-center">
                                <span
                                  className={`inline-block h-3.5 w-10 rounded-xs shadow-2xs ${bg}`}
                                  title={`${s.name} (${s.date}): ${title}`}
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

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-slate-500 font-medium">
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
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONSISTENCY (Matches Image 2)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'consistency' && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Consistency Summary</h2>
              <p className="text-xs text-slate-500">Daily solved problems across hub &amp; competitive judges.</p>
            </div>
            <span className="chip bg-emerald-50 text-emerald-800 text-xs font-bold">
              {summary.totalSolves} solves total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5 px-3 min-w-[210px]">Student</th>
                  {consistencyDates.map((dateStr) => {
                    const [y, m, d] = dateStr.split('-');
                    return (
                      <th key={dateStr} className="py-2.5 px-1 text-center min-w-[34px]">
                        <span className="text-[10px] text-slate-600 font-semibold">{Number(d)}.{Number(m)}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {consistency.length === 0 ? (
                  <tr>
                    <td colSpan={consistencyDates.length + 1} className="py-8 text-center text-xs text-slate-400">
                      No daily consistency data recorded.
                    </td>
                  </tr>
                ) : (
                  consistency.map((row) => {
                    const dayMap = new Map(row.days.map((d) => [d.day, d.count]));
                    const targetSolves = Math.max(20, row.totalSolves + 5);
                    const pct = Math.min(100, Math.round((row.totalSolves / targetSolves) * 100));

                    return (
                      <tr key={row.userId} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-600 shrink-0">
                              <span>💧</span>
                              <span>0/{targetSolves}</span>
                            </span>
                            <Avatar name={row.name} url={row.avatarUrl} size="h-6 w-6 text-[10px]" />
                            <Link
                              href={`/profile?userId=${row.userId}`}
                              className="font-bold text-slate-800 hover:text-emerald-700 transition truncate max-w-[100px]"
                            >
                              {row.name}
                            </Link>
                            <span className="text-[10px] text-slate-400">
                              ({row.totalSolves}/{targetSolves} | {pct}%)
                            </span>
                          </div>
                        </td>

                        {consistencyDates.map((dateStr) => {
                          const count = dayMap.get(dateStr) ?? 0;
                          let bgClass = 'bg-[#fecaca] text-transparent'; // 0 solves / missed (salmon)
                          if (count === 1) bgClass = 'bg-[#22c55e] text-white';
                          else if (count === 2) bgClass = 'bg-[#16a34a] text-white';
                          else if (count === 3) bgClass = 'bg-[#f59e0b] text-white';
                          else if (count >= 4 && count < 6) bgClass = 'bg-[#ea580c] text-white';
                          else if (count >= 6) bgClass = 'bg-[#3b82f6] text-white';

                          return (
                            <td key={dateStr} className="py-1 px-0.5 text-center">
                              <span
                                className={`inline-grid place-items-center h-5 w-7 rounded-xs text-[10px] font-extrabold shadow-2xs ${bgClass}`}
                                title={`${dateStr}: ${count} solves`}
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
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COMPLETION (Matches Image 3)                                       */}
      {/* ========================================================================= */}
      {activeTab === 'completion' && (
        <div className="space-y-6">
          {/* Top Card: Team Completion Progress Bar & Donut Gauge (Matching Image 3) */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xs">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Left: Overall Team Progress Bar */}
              <div className="w-full flex-1 space-y-4 text-center lg:text-left">
                <h2 className="text-xl font-bold text-slate-900 text-center">Team Completion</h2>

                <div className="h-6 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.max(5, summary.avgCompletionPct)}%` }}
                  />
                </div>

                <p className="text-xs font-medium text-slate-500 text-center">
                  {summary.totalExercises} Exercises | {summary.avgCompleted} Solved (average) |{' '}
                  <span className="font-bold text-slate-800">{summary.avgCompletionPct}% Completion</span> |{' '}
                  {summary.avgAvailable} Available (average)
                </p>
              </div>

              {/* Right: Donut Chart Indicator (Matching Image 3) */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative h-28 w-28 grid place-items-center">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                    {/* Background circle */}
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Bad arc (5%) */}
                    <path
                      className="text-rose-500"
                      strokeDasharray="5, 100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Okay arc (10%) */}
                    <path
                      className="text-amber-400"
                      strokeDasharray="10, 100"
                      strokeDashoffset="-5"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Good arc (up to pct%) */}
                    <path
                      className="text-emerald-500"
                      strokeDasharray={`${summary.avgCompletionPct}, 100`}
                      strokeDashoffset="-15"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-semibold text-slate-400">State</span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {summary.avgCompletionPct >= 75 ? 'Good' : summary.avgCompletionPct >= 50 ? 'Okay' : 'Needs Focus'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">{summary.avgCompletionPct}%</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Good
                  </span>
                  <span className="flex items-center gap-1 text-amber-500">
                    <span className="h-2 w-2 rounded-full bg-amber-400" /> Okay
                  </span>
                  <span className="flex items-center gap-1 text-rose-500">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Bad
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Detail Team Completion (Matching Image 3) */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setShowDetailCompletion((v) => !v)}
            >
              <h3 className="text-sm font-bold text-slate-800">Detail Team Completion</h3>
              <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
                <Icon name="chevronRight" className={`h-4 w-4 transition-transform ${showDetailCompletion ? '-rotate-90' : 'rotate-90'}`} />
              </button>
            </div>

            {showDetailCompletion && (
              <div className="space-y-3.5 pt-2">
                {completion.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">No student track completion records found.</p>
                ) : (
                  completion.map((row) => {
                    const available = Math.max(0, row.total - row.solved);
                    return (
                      <div key={row.userId} className="flex items-center gap-4 py-1">
                        <Avatar name={row.name} url={row.avatarUrl} size="h-7 w-7 text-xs" />
                        <div className="min-w-0 w-28 shrink-0">
                          <Link
                            href={`/profile?userId=${row.userId}`}
                            className="font-bold text-xs text-slate-900 hover:text-emerald-700 truncate block"
                          >
                            {row.name}
                          </Link>
                        </div>

                        <div className="w-56 shrink-0 text-right text-xs font-medium text-slate-600">
                          <span className="font-bold text-slate-800">{row.solved} Solved</span> |{' '}
                          <span className="font-bold text-emerald-700">{row.pct}% Completion</span> |{' '}
                          <span>{available} Available</span>
                        </div>

                        <div className="h-2.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: EXERCISE (Matches Image 4)                                         */}
      {/* ========================================================================= */}
      {activeTab === 'exercise' && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Exercise Summary</h2>
              <p className="text-xs text-slate-500">Track and inspect submissions, attempts, and completion times.</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={exerciseFilter}
                onChange={(e) => setExerciseFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Progress: All Problems</option>
                <option value="solved">Solved Only</option>
                <option value="unsolved">Unsolved Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5 px-3 w-8 text-center">{exercise.problems.length}</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Student</th>
                  {exercise.problems.slice(0, 15).map((p) => {
                    const platform = p.platform ?? 'leetcode';
                    return (
                      <th key={p.id} className="py-2.5 px-2 min-w-[140px] max-w-[170px]" title={p.name}>
                        <a
                          href={p.link || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-slate-800 hover:text-emerald-600 truncate block"
                        >
                          {p.name}
                        </a>
                        <div className="mt-0.5 text-[10px] font-medium text-amber-600 truncate">
                          {platform} · {p.difficulty}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70">
                {exercise.students.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-8 text-center text-xs text-slate-400">
                      No exercise submission records recorded.
                    </td>
                  </tr>
                ) : (
                  exercise.students.map((st, idx) => {
                    const solvedCount = Object.keys(st.cells).length;
                    const pct = exercise.problems.length ? Math.round((solvedCount / exercise.problems.length) * 100) : 0;

                    return (
                      <tr key={st.userId} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <Link
                            href={`/profile?userId=${st.userId}`}
                            className="flex items-center gap-2 hover:text-emerald-700 transition"
                          >
                            <Avatar name={st.name} url={st.avatarUrl} size="h-6 w-6 text-[10px]" />
                            <span className="font-bold text-slate-800 truncate max-w-[110px]">{st.name}</span>
                            <span className="text-[10px] text-slate-400">
                              ({solvedCount}/{pct}%)
                            </span>
                          </Link>
                        </td>

                        {exercise.problems.slice(0, 15).map((p) => {
                          const cell = st.cells[p.id];
                          if (!cell) {
                            return <td key={p.id} className="py-2 px-2 text-center text-slate-300">—</td>;
                          }
                          return (
                            <td key={p.id} className="py-2 px-1">
                              <span
                                className="inline-flex items-center justify-center gap-1.5 w-full rounded-md bg-[#22c55e] px-2 py-1 text-[11px] font-bold text-white shadow-2xs"
                                title={`${st.name} solved with ${cell.attempts} tries in ${cell.minutes}m`}
                              >
                                <span>↻ {cell.attempts}</span>
                                <span>⏱ {cell.minutes} min</span>
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
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: UPSOLVING (Matches Image 5)                                        */}
      {/* ========================================================================= */}
      {activeTab === 'upsolving' && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Contest Upsolving</h2>
              <Link
                href="/contests"
                className="mt-0.5 inline-block text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
              >
                Open Standings
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Contest:</span>
              <select
                value={selectedContestId}
                onChange={(e) => setSelectedContestId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer max-w-[240px]"
              >
                {upsolving.contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!activeContest ? (
            <p className="py-8 text-center text-xs text-slate-400">No contests recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 font-bold">
                    <th className="py-2.5 px-3 min-w-[170px] text-slate-400">Participant</th>
                    {activeContest.problems.map((p) => (
                      <th
                        key={p.problemId}
                        className="py-2.5 px-2 text-center min-w-[120px] bg-[#15803d] text-white rounded-t-md mx-0.5"
                      >
                        <span className="truncate block font-bold text-xs">{p.pseudo} - {p.name ?? 'Problem'}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {upsolving.students.length === 0 ? (
                    <tr>
                      <td colSpan={activeContest.problems.length + 1} className="py-8 text-center text-xs text-slate-400">
                        No submissions for this contest yet.
                      </td>
                    </tr>
                  ) : (
                    upsolving.students.map((st, idx) => {
                      const rankSuffix = idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `${idx + 1}th`;

                      return (
                        <tr key={st.userId} className="hover:bg-slate-50/60 transition">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-400 w-8">{rankSuffix}</span>
                              <Avatar name={st.name} url={st.avatarUrl} size="h-6 w-6 text-[10px]" />
                              <Link
                                href={`/profile?userId=${st.userId}`}
                                className="font-bold text-slate-800 hover:text-emerald-700 transition truncate max-w-[100px]"
                              >
                                {st.name}
                              </Link>
                            </div>
                          </td>

                          {activeContest.problems.map((p) => {
                            const cell = st.cells[p.problemId];
                            if (!cell) {
                              return (
                                <td key={p.problemId} className="py-2 px-1 text-center">
                                  <span className="inline-block h-4 w-16 rounded-full bg-slate-100" />
                                </td>
                              );
                            }

                            // Dark green for contest solve, amber for upsolved
                            const isUpsolve = cell.isUpsolve ?? false;
                            const bg = isUpsolve ? 'bg-[#b45309]' : 'bg-[#15803d]';

                            return (
                              <td key={p.problemId} className="py-2 px-1 text-center">
                                <span
                                  className={`inline-block w-full rounded-md ${bg} py-1 text-center text-[11px] font-bold text-white shadow-2xs`}
                                  title={`${cell.attempts} attempts in ${cell.minutes} min (${isUpsolve ? 'Upsolved' : 'Contest'})`}
                                >
                                  {cell.attempts} | {cell.minutes}m
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
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: DIVISIONS                                                          */}
      {/* ========================================================================= */}
      {activeTab === 'divisions' && (
        <div className="space-y-6">
          <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">Skill Divisions &amp; Placement</h2>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
              Students are grouped into competitive divisions according to their performance and rating thresholds.
              This system provides appropriate challenges and tracks tailored growth over time.
            </p>
          </header>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {divisions.divisions.map((d) => (
              <section key={d.name} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
                  <span className="chip bg-emerald-50 text-emerald-800 text-xs font-bold">
                    Rating {d.minRating}–{d.maxRating}
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {d.students.length === 0 ? (
                    <li className="py-6 text-center text-xs text-slate-400">No students in this division.</li>
                  ) : (
                    d.students.map((st) => (
                      <li key={st.userId} className="flex items-center justify-between py-2.5">
                        <Link
                          href={`/profile?userId=${st.userId}`}
                          className="flex items-center gap-2 hover:text-emerald-700 transition"
                        >
                          <Avatar name={st.name} url={st.avatarUrl} size="h-6 w-6 text-[10px]" />
                          <span className="text-xs font-bold text-slate-800">{st.name}</span>
                        </Link>
                        <span className="font-extrabold text-xs text-slate-900">{st.rating}</span>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            ))}

            {divisions.unassigned.length > 0 && (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">Unassigned / Provisional</h3>
                  <span className="chip bg-slate-100 text-slate-700 text-xs font-bold">
                    {divisions.unassigned.length}
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {divisions.unassigned.map((st) => (
                    <li key={st.userId} className="flex items-center justify-between py-2.5">
                      <Link
                        href={`/profile?userId=${st.userId}`}
                        className="flex items-center gap-2 hover:text-emerald-700 transition"
                      >
                        <Avatar name={st.name} url={st.avatarUrl} size="h-6 w-6 text-[10px]" />
                        <span className="text-xs font-bold text-slate-800">{st.name}</span>
                      </Link>
                      <span className="font-extrabold text-xs text-slate-900">{st.rating}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

