import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type SuperGroup } from '@/lib/api';
import { TrackEditor } from '@/components/head/track-editor';

/** HoE/HoA: create a new track (SPEC §7.6). */
export default async function NewTrackPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const superGroups = ((await safe(hubFetch<SuperGroup[]>('/super-groups'))) ?? []);

  return (
    <div className="space-y-6">
      <header className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Track</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a new curriculum phase for a super group cohort.
        </p>
      </header>
      <TrackEditor superGroups={superGroups} />
    </div>
  );
}
