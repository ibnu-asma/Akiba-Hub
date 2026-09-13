import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group, type SubmissionDto } from '@/lib/api';
import { SummaryHub } from '@/components/summary/summary-hub';
import { GroupComparison } from '@/components/comparison/group-comparison';
import { SubmissionFeed } from '@/components/submission-feed';
import type {
  AttendanceRow,
  CompletionRow,
  ConsistencyRow,
  DivisionsData,
  ExerciseMatrix,
  UpsolvingMatrix,
} from '@/components/summary/types';

/** Summary reporting hub (SPEC §7.10) — HoE/HoA command center with 7-item sub-nav. */
export default async function SummaryPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const [groups, attendance, consistency, completion, exercise, upsolving, divisions, submissions] = await Promise.all([
    safe(hubFetch<Group[]>('/groups')),
    safe(hubFetch<AttendanceRow[]>('/summary/attendance')),
    safe(hubFetch<ConsistencyRow[]>('/summary/consistency')),
    safe(hubFetch<CompletionRow[]>('/summary/completion')),
    safe(hubFetch<ExerciseMatrix>('/summary/exercise')),
    safe(hubFetch<UpsolvingMatrix>('/summary/upsolving')),
    safe(hubFetch<DivisionsData>('/summary/divisions')),
    safe(hubFetch<SubmissionDto[]>('/submissions?limit=20')),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Summary</h1>
        <p className="mt-1 text-sm text-slate-500">
          Attendance, consistency, completion, exercises, up-solving, and divisions across your scope.
        </p>
      </header>

      <SummaryHub
        attendance={attendance ?? []}
        consistency={consistency ?? []}
        completion={completion ?? []}
        exercise={exercise ?? { problems: [], students: [] }}
        upsolving={upsolving ?? { contests: [], students: [] }}
        divisions={divisions ?? { divisions: [], unassigned: [] }}
      />

      <section className="card p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Latest Submissions</h2>
        </div>
        <SubmissionFeed submissions={submissions ?? []} />
      </section>

      <GroupComparison groups={groups ?? []} />
    </div>
  );
}
