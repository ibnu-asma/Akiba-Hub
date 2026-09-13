import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ExerciseDto, type ProblemDto, type SuperGroup, type TrackDto } from '@/lib/api';
import { ExercisesManager } from '@/components/head/exercises-manager';

interface ListResponse {
  rows: ExerciseDto[];
  total: number;
}

/** HoE/HoA: exercise management — cross-track problems (SPEC §7.8). */
export default async function ExercisesPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const [superGroups, tracks, problems, initial] = await Promise.all([
    safe(hubFetch<SuperGroup[]>('/super-groups')),
    safe(hubFetch<TrackDto[]>('/tracks')),
    safe(hubFetch<ProblemDto[]>('/problems?limit=200')),
    safe(hubFetch<ListResponse>('/tracks/exercises?limit=10&offset=0')),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exercises</h1>
        <p className="mt-1 text-sm text-slate-500">
          The problems inside each track — add, remove, or reassign exercises across the curriculum.
        </p>
      </header>
      <ExercisesManager
        initial={initial?.rows ?? []}
        initialTotal={initial?.total ?? 0}
        superGroups={superGroups ?? []}
        tracks={tracks ?? []}
        problems={problems ?? []}
      />
    </div>
  );
}