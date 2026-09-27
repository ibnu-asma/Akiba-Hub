import { redirect, notFound } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type SuperGroup, type TrackDto } from '@/lib/api';
import { TrackEditor } from '@/components/head/track-editor';

/** HoE/HoA: edit an existing track. */
export default async function EditTrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const [superGroups, tracks] = await Promise.all([
    safe(hubFetch<SuperGroup[]>('/super-groups')),
    safe(hubFetch<TrackDto[]>('/tracks')),
  ]);

  const track = (tracks ?? []).find((t) => t.id === id);
  if (!track) notFound();

  return (
    <div className="space-y-6">
      <header className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Track</h1>
        <p className="mt-1 text-sm text-slate-500">
          Modify the properties of {track.name}.
        </p>
      </header>
      <TrackEditor superGroups={superGroups ?? []} initialTrack={track} />
    </div>
  );
}
