import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe } from '@/lib/api';
import type { SessionDto } from '@/components/head/session-editor';
import { Icon } from '@/components/icon';

/** HoE/HoA: list sessions (SPEC §7.3). */
export default async function SessionsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const sessions = await safe(hubFetch<SessionDto[]>('/sessions?all=1'));

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sessions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your lectures, contests, and meetings.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/sessions/new" className="btn-primary py-2 px-4 text-sm shadow-sm">
            + Add Session
          </a>
        </div>
      </header>

            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Session Name</th>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Cohorts</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {(sessions ?? []).map((session) => (
                <tr key={session.id} className="hover:bg-slate-50/50 transition group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{session.name}</div>
                    {session.description && (
                      <div className="mt-1 text-xs text-slate-500 line-clamp-1">{session.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-700">{session.startAt.slice(0, 10)}</div>
                    {session.startAt && (
                      <div className="mt-0.5 text-xs text-slate-400">{session.startAt} {session.endAt ? `- ${session.endAt}` : ''}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      <Icon name="users" className="h-3 w-3 text-slate-400" />
                      {session.groupIds?.length ?? 0} Cohorts
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition">
                      <a
                        href={`/attendance?session=${session.id}`}
                        className="text-xs font-bold text-a2sv-600 hover:text-a2sv-700 transition"
                      >
                        Attendance &rarr;
                      </a>
                      <a
                        href={`/sessions/${session.id}/edit`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-a2sv-600 hover:bg-a2sv-50 transition"
                        aria-label="Edit session"
                      >
                        <Icon name="clipboard" className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              
              {(!sessions || sessions.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Icon name="calendar" className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">No sessions found</h3>
                    <p className="mt-1 text-xs">Get started by scheduling your first session.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}