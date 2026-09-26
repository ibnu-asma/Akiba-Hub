import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ProblemDto, type TrackDto } from '@/lib/api';
import { ExerciseEditor } from '@/components/head/exercise-editor';

/** HoE/HoA: Add exercises page (SPEC §7.8). */
export default async function AddExercisePage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const [tracks, problems] = await Promise.all([
    safe(hubFetch<TrackDto[]>('/tracks')),
    safe(hubFetch<ProblemDto[]>('/problems?limit=200')),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Exercises</h1>
        <p className="mt-1 text-sm text-slate-500">
          Assign existing problems from the database to a curriculum track.
        </p>
      </header>
      <ExerciseEditor
        tracks={tracks ?? []}
        problems={(problems as unknown as ProblemDto[]) ?? []}
      />
    </div>
  );
}
