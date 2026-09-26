import { redirect, notFound } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group } from '@/lib/api';
import { SessionEditor, type SessionDto } from '@/components/head/session-editor';

/** HoE/HoA: edit a session (SPEC §7.3). */
export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const [session, groups] = await Promise.all([
    safe(hubFetch<SessionDto>(`/sessions/${id}`)),
    safe(hubFetch<Group[]>('/groups')),
  ]);

  if (!session) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Session</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update the session details, schedule, or assigned cohorts.
        </p>
      </header>
      <SessionEditor groups={groups ?? []} session={session} />
    </div>
  );
}
