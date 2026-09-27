'use client';

import { useState, useMemo } from 'react';
import { DivisionsView, MatrixView, Stat, UpsolvingView } from './matrix-views';
import { Icon } from '@/components/icon';
import type { Group } from '@/lib/api';
import type {
  AttendanceRow,
  CompletionRow,
  ConsistencyRow,
  DivisionsData,
  ExerciseMatrix,
  UpsolvingMatrix,
} from './types';

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'completion', label: 'Completion' },
  { key: 'exercise', label: 'Exercise' },
  { key: 'upsolving', label: 'Upsolving' },
  { key: 'divisions', label: 'Divisions' },
] as const;

type TabKey = (typeof TABS)[number]['key'];
const ALL = '__all__';

export function SummaryHub({
  groups,
  attendance,
  consistency,
  completion,
  exercise,
  upsolving,
  divisions,
}: {
  groups: Group[];
  attendance: AttendanceRow[];
  consistency: ConsistencyRow[];
  completion: CompletionRow[];
  exercise: ExerciseMatrix;
  upsolving: UpsolvingMatrix;
  divisions: DivisionsData;
}) {
  const [tab, setTab] = useState<TabKey>('summary');
  const [q, setQ] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(ALL);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Filter logic
  const matchUser = (u: { name: string; groupId?: string | null }) => {
    const query = q.trim().toLowerCase();
    if (query && !u.name.toLowerCase().includes(query)) return false;
    if (selectedGroupId !== ALL && u.groupId !== selectedGroupId) return false;
    return true;
  };

  const filteredAttendance = useMemo(() => attendance.filter(matchUser), [attendance, q, selectedGroupId]);
  const filteredConsistency = useMemo(() => consistency.filter(matchUser), [consistency, q, selectedGroupId]);
  const filteredCompletion = useMemo(() => completion.filter(matchUser), [completion, q, selectedGroupId]);
  
  const filteredExercise = useMemo(() => ({
    problems: exercise.problems,
    students: exercise.students.filter(matchUser),
  }), [exercise, q, selectedGroupId]);

  const filteredUpsolving = useMemo(() => ({
    contests: upsolving.contests,
    students: upsolving.students.filter(matchUser),
  }), [upsolving, q, selectedGroupId]);

  const filteredDivisions = useMemo(() => ({
    divisions: divisions.divisions.map(d => ({
      ...d,
      students: d.students.filter(matchUser),
    })),
    unassigned: divisions.unassigned.filter(matchUser),
  }), [divisions, q, selectedGroupId]);

  // Pagination logic for lists
  const paginatedAttendance = useMemo(() => filteredAttendance.slice(page * pageSize, (page + 1) * pageSize), [filteredAttendance, page]);
  const paginatedConsistency = useMemo(() => filteredConsistency.slice(page * pageSize, (page + 1) * pageSize), [filteredConsistency, page]);
  const paginatedCompletion = useMemo(() => filteredCompletion.slice(page * pageSize, (page + 1) * pageSize), [filteredCompletion, page]);

  const totalPages = Math.ceil(
    (tab === 'attendance' ? filteredAttendance.length :
     tab === 'consistency' ? filteredConsistency.length :
     tab === 'completion' ? filteredCompletion.length : 0) / pageSize
  );

  const totalFilteredListCount = tab === 'attendance' ? filteredAttendance.length : tab === 'consistency' ? filteredConsistency.length : tab === 'completion' ? filteredCompletion.length : 0;

  const totalPresent = filteredAttendance.reduce((sum, r) => sum + r.present, 0);
  const totalAttendance = filteredAttendance.reduce((sum, r) => sum + r.total, 0);
  const totalSolves = filteredConsistency.reduce((sum, r) => sum + r.totalSolves, 0);
  const avgCompletion = filteredCompletion.length
    ? Math.round(filteredCompletion.reduce((sum, r) => sum + r.pct, 0) / filteredCompletion.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Filters Control Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search students by name..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100"
          />
        </div>
        <select
          value={selectedGroupId}
          onChange={(e) => { setSelectedGroupId(e.target.value); setPage(0); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none text-slate-700 min-w-[200px]"
        >
          <option value={ALL}>All Cohorts</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Modern Tabs */}
      <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1 font-semibold text-sm w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); setPage(0); }}
              className={`rounded-lg px-4 py-1.5 transition-all ${
                tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'summary' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Students" value={String(filteredAttendance.length)} />
          <Stat
            label="Attendance"
            value={totalAttendance ? `${Math.round((totalPresent / totalAttendance) * 100)}%` : '—'}
            sub={`${totalPresent}/${totalAttendance} present`}
          />
          <Stat label="Solves" value={String(totalSolves)} sub={`${filteredConsistency.reduce((s, r) => s + r.activeDays, 0)} active days`} />
          <Stat label="Completion" value={`${avgCompletion}%`} sub={`${filteredCompletion.length} students`} />
        </div>
      )}

      {tab === 'attendance' && (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Present</th>
                  <th className="px-4 py-3 font-semibold">Absent</th>
                  <th className="px-4 py-3 font-semibold">Excused</th>
                  <th className="px-4 py-3 font-semibold">Late</th>
                  <th className="px-4 py-3 font-semibold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  paginatedAttendance.map((r) => (
                    <tr key={r.userId} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                      <td className="px-4 py-3 text-a2sv-700">{r.present}</td>
                      <td className="px-4 py-3 text-red-600">{r.absent}</td>
                      <td className="px-4 py-3 text-amber-600">{r.excused}</td>
                      <td className="px-4 py-3 text-blue-600">{r.late}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.presentPct}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <Pagination page={page} setPage={setPage} totalPages={totalPages} totalItems={totalFilteredListCount} pageSize={pageSize} />}
        </section>
      )}

      {tab === 'consistency' && (
        <section>
          <ul className="space-y-3">
            {paginatedConsistency.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No solves recorded yet.</p>}
            {paginatedConsistency.map((r) => (
              <li key={r.userId} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{r.name}</p>
                  <p className="text-xs text-slate-400">
                    {r.activeDays} active day{r.activeDays === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                  {r.days.slice(-14).map((d) => (
                    <span
                      key={d.day}
                      title={`${d.day}: ${d.count}`}
                      className="h-6 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: d.count >= 3 ? '#0fa958' : d.count >= 1 ? '#7fd4a6' : '#e2e8f0' }}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold text-slate-900 shrink-0">{r.totalSolves}</span>
              </li>
            ))}
          </ul>
          {totalPages > 1 && <div className="mt-4"><Pagination page={page} setPage={setPage} totalPages={totalPages} totalItems={totalFilteredListCount} pageSize={pageSize} /></div>}
        </section>
      )}

      {tab === 'completion' && (
        <section>
          <ul className="space-y-3">
            {paginatedCompletion.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No tracks assigned yet.</p>}
            {paginatedCompletion.map((r) => (
              <li key={r.userId} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-800">{r.name}</p>
                  <span className="text-sm font-bold text-slate-900">
                    {r.solved}/{r.total} · {r.pct}%
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-a2sv-500 transition-all" style={{ width: `${r.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && <div className="mt-4"><Pagination page={page} setPage={setPage} totalPages={totalPages} totalItems={totalFilteredListCount} pageSize={pageSize} /></div>}
        </section>
      )}

      {tab === 'exercise' && <MatrixView problems={filteredExercise.problems} students={filteredExercise.students} />}
      {tab === 'upsolving' && <UpsolvingView upsolving={filteredUpsolving} />}
      {tab === 'divisions' && <DivisionsView divisions={filteredDivisions} />}
    </div>
  );
}

function Pagination({ page, setPage, totalPages, totalItems, pageSize }: { page: number; setPage: (p: number) => void; totalPages: number; totalItems: number; pageSize: number }) {
  return (
    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-xl">
      <span className="text-sm text-slate-500">
        Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalItems)} of {totalItems} entries
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          Prev
        </button>
        <div className="hidden sm:flex items-center px-1">
          {Array.from({ length: totalPages }).map((_, i) => {
            if (i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1) {
              return (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${i === page ? 'bg-a2sv-500 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  {i + 1}
                </button>
              );
            }
            if (Math.abs(i - page) === 2) {
              return <span key={i} className="text-slate-400 px-1">...</span>;
            }
            return null;
          })}
        </div>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
