import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group } from '@/lib/api';
import { AddSessionForm } from '@/components/head/add-session-form';

/** HoE/HoA: schedule a session — classes, review, resume polishing, etc. (SPEC §7.3). */
export default async function AddSessionPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const groups = (await safe(hubFetch<Group[]>('/groups'))) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Session</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sessions are events such as usual classes, linked-in review sessions, resume polishing sessions and more — with a
          location or meeting link for remote participants.
        </p>
      </header>
      <AddSessionForm groups={groups} />
    </div>
  );
}