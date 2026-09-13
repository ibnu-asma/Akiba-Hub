import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ProblemDto, type SuperGroup, type TrackDto } from '@/lib/api';
import { TracksManager } from '@/components/head/tracks-manager';

/** HoE/HoA: track management — curriculum phases per super group (SPEC §7.6). */
export default async function TracksPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const [superGroups, tracks, problems] = await Promise.all([
    safe(hubFetch<SuperGroup[]>('/super-groups')),
    safe(hubFetch<TrackDto[]>('/tracks')),
    safe(hubFetch<ProblemDto[]>('/problems?limit=200')),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tracks</h1>
        <p className="mt-1 text-sm text-slate-500">
          The five education phases, one per super group — create, edit, and manage each track&apos;s problems.
        </p>
      </header>
      <TracksManager initialTracks={tracks ?? []} superGroups={superGroups ?? []} problems={problems ?? []} />
    </div>
  );
}
