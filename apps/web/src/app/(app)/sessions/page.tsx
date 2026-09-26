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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(sessions ?? []).map((session) => (
          <article
            key={session.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-slate-900 leading-tight">{session.name}</h3>
                <a
                  href={`/sessions/${session.id}/edit`}
                  className="text-slate-400 hover:text-a2sv-600 p-1 transition opacity-0 group-hover:opacity-100"
                  aria-label="Edit session"
                >
                  <Icon name="clipboard" className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {session.date} {session.startTime ? `· ${session.startTime}` : ''}
              </p>
              {session.description && (
                <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">{session.description}</p>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                <Icon name="users" className="h-3 w-3 text-slate-400" />
                {session.groupIds?.length ?? 0} Cohorts
              </span>
              
              <a
                href={`/attendance?session=${session.id}`}
                className="text-xs font-bold text-a2sv-600 hover:text-a2sv-700 transition"
              >
                Take Attendance &rarr;
              </a>
            </div>
          </article>
        ))}
        
        {(!sessions || sessions.length === 0) && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
            <Icon name="calendar" className="mx-auto h-8 w-8 text-slate-400 mb-3" />
            <h3 className="text-sm font-bold text-slate-900">No sessions found</h3>
            <p className="mt-1 text-xs text-slate-500">Get started by scheduling your first session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
