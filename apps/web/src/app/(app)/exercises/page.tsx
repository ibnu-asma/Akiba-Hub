import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ExerciseDto } from '@/lib/api';
import { mySolvedSet, solverMap } from '@/lib/student';
import { ExercisesBoard } from '@/components/student/exercises-board';

/** Student Exercises — day-by-day problem sets grouped by track (SPEC §6.9). */
export default async function StudentExercisesPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) >= 2) redirect('/exercises/new');

  const [exercises, solved, solvers] = await Promise.all([
    safe(hubFetch<ExerciseDto[]>('/tracks/exercises')),
    mySolvedSet(),
    solverMap(),
  ]);

  return (
    <ExercisesBoard
      exercises={exercises ?? []}
      solved={solved}
      solvers={solvers}
      mySuperGroupId={me.superGroupId}
      myId={me.id}
    />
  );
}