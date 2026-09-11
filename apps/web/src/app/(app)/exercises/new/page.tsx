import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ProblemDto, type TrackDto } from '@/lib/api';
import { AddExerciseForm } from '@/components/head/add-exercise-form';

/** HoE/HoA: attach problems to a track as exercises (SPEC §7.5 / §Summary D). */
export default async function AddExercisePage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const [tracks, problems] = await Promise.all([
    safe(hubFetch<TrackDto[]>('/tracks')),
    safe(hubFetch<ProblemDto[]>('/problems')),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Exercise</h1>
        <p className="mt-1 text-sm text-slate-500">
          Exercises are the problems inside a track. Attach problems to fill a track — students track their completion percentage
          against it in the Completions panel.
        </p>
      </header>
      <AddExerciseForm tracks={tracks ?? []} problems={problems ?? []} />
    </div>
  );
}