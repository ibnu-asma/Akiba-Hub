import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group } from '@/lib/api';
import { SessionEditor } from '@/components/head/session-editor';

/** HoE/HoA: schedule a new session (SPEC §7.3). */
export default async function NewSessionPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const groups = await safe(hubFetch<Group[]>('/groups'));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Session</h1>
        <p className="mt-1 text-sm text-slate-500">
          Schedule a new lecture, contest, or meeting and assign it to your cohorts.
        </p>
      </header>
      <SessionEditor groups={groups ?? []} />
    </div>
  );
}
