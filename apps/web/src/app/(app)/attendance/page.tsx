import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group, type SessionDto } from '@/lib/api';
import { AttendanceRoster } from '@/components/head/attendance-roster';

/** HoE/HoA: take attendance for a session — roster per group (SPEC §7.4). */
export default async function AttendancePage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const [sessions, groups] = await Promise.all([
    safe(hubFetch<SessionDto[]>('/sessions')),
    safe(hubFetch<Group[]>('/groups')),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Take Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">Pick a session and group, then mark each participant Present, Excused, Late or Absent.</p>
      </header>
      <AttendanceRoster sessions={sessions ?? []} groups={groups ?? []} />
    </div>
  );
}