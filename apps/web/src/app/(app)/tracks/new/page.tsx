import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type SuperGroup } from '@/lib/api';
import { AddTrackForm } from '@/components/head/add-track-form';

/** HoE/HoA: create tracks for the education seasons/program phases (SPEC §7.5). */
export default async function AddTrackPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const superGroups = (await safe(hubFetch<SuperGroup[]>('/super-groups'))) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Track</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tracks group the year-long education program into five phases — Python Track, Education Phase I, Camp I, Education Phase
          II, and Camp II. Create one per super group and phase; exercises are then attached to it.
        </p>
      </header>
      {superGroups.length === 0 && (
        <p className="card-tint px-4 py-3 text-sm text-slate-600">No super groups yet — a Head of Academy needs to create one first.</p>
      )}
      <AddTrackForm superGroups={superGroups} />
    </div>
  );
}