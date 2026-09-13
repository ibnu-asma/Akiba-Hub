'use client';

import { useState } from 'react';
import { DivisionsView, MatrixView, Stat, UpsolvingView } from './matrix-views';
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

export function SummaryHub({
  attendance,
  consistency,
  completion,
  exercise,
  upsolving,
  divisions,
}: {
  attendance: AttendanceRow[];
  consistency: ConsistencyRow[];
  completion: CompletionRow[];
  exercise: ExerciseMatrix;
  upsolving: UpsolvingMatrix;
  divisions: DivisionsData;
}) {
  const [tab, setTab] = useState<TabKey>('summary');

  const totalPresent = attendance.reduce((sum, r) => sum + r.present, 0);
  const totalAttendance = attendance.reduce((sum, r) => sum + r.total, 0);
  const totalSolves = consistency.reduce((sum, r) => sum + r.totalSolves, 0);
  const avgCompletion = completion.length
    ? Math.round(completion.reduce((sum, r) => sum + r.pct, 0) / completion.length)
    : 0;

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`chip px-3.5 py-1.5 text-sm transition ${
              tab === t.key ? 'bg-a2sv-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'summary' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Students" value={String(attendance.length)} />
          <Stat
            label="Attendance"
            value={totalAttendance ? `${Math.round((totalPresent / totalAttendance) * 100)}%` : '—'}
            sub={`${totalPresent}/${totalAttendance} present`}
          />
          <Stat label="Solves" value={String(totalSolves)} sub={`${consistency.reduce((s, r) => s + r.activeDays, 0)} active days`} />
          <Stat label="Completion" value={`${avgCompletion}%`} sub={`${completion.length} students`} />
        </div>
      )}

      {tab === 'attendance' && (
        <section className="card overflow-hidden">
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
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    No attendance records yet.
                  </td>
                </tr>
              ) : (
                attendance.map((r) => (
                  <tr key={r.userId}>
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
        </section>
      )}


      {tab === 'consistency' && (
        <ul className="space-y-3">
          {consistency.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No solves recorded yet.</p>}
          {consistency.map((r) => (
            <li key={r.userId} className="card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{r.name}</p>
                <p className="text-xs text-slate-400">
                  {r.activeDays} active day{r.activeDays === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex gap-1">
                {r.days.slice(-14).map((d) => (
                  <span
                    key={d.day}
                    title={`${d.day}: ${d.count}`}
                    className="h-6 w-3 rounded-sm"
                    style={{ backgroundColor: d.count >= 3 ? '#0fa958' : d.count >= 1 ? '#7fd4a6' : '#e2e8f0' }}
                  />
                ))}
              </div>
              <span className="text-lg font-bold text-slate-900">{r.totalSolves}</span>
            </li>
          ))}
        </ul>
      )}

      {tab === 'completion' && (
        <ul className="space-y-3">
          {completion.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No tracks assigned yet.</p>}
          {completion.map((r) => (
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
      )}

      {tab === 'exercise' && <MatrixView problems={exercise.problems} students={exercise.students} />}
      {tab === 'upsolving' && <UpsolvingView upsolving={upsolving} />}
      {tab === 'divisions' && <DivisionsView divisions={divisions} />}
    </div>
  );
}
