import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group } from '@/lib/api';
import { GroupComparison } from '@/components/comparison/group-comparison';
import type { AttendanceRow, ConsistencyRow } from '@/components/summary/types';

/** Reports (SPEC §8.9) — HoA: absentees, problem-solving activity, group comparison. */
export default async function ReportsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  const [groups, attendance, consistency] = await Promise.all([
    safe(hubFetch<Group[]>('/groups')),
    safe(hubFetch<AttendanceRow[]>('/summary/attendance')),
    safe(hubFetch<ConsistencyRow[]>('/summary/consistency')),
  ]);

  const rows = attendance ?? [];
  const absentees = rows.filter((r) => r.absent > 0).sort((a, b) => b.absent - a.absent);
  const totalAbsent = rows.reduce((s, r) => s + r.absent, 0);
  const totalSolves = (consistency ?? []).reduce((s, r) => s + r.totalSolves, 0);
  const totalActiveDays = (consistency ?? []).reduce((s, r) => s + r.activeDays, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Academy-wide performance, absentees, and problem-solving time.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm font-medium text-slate-500">Absences</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{totalAbsent}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-slate-500">Solves</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{totalSolves}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-medium text-slate-500">Active days</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{totalActiveDays}</p>
        </div>
      </div>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900">Absentees</h2>
        {absentees.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No absences recorded.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {absentees.map((r) => (
              <li key={r.userId} className="flex items-center justify-between px-4 py-3">
                <span className="truncate text-sm font-semibold text-slate-800">{r.name}</span>
                <span className="text-sm font-bold text-red-600">{r.absent} absent</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <GroupComparison groups={groups ?? []} />
    </div>
  );
}
