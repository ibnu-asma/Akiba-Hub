import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ProblemDto } from '@/lib/api';
import { mySolvedSet, solverMap } from '@/lib/student';
import { ProblemsBoard } from '@/components/student/problems-board';

/** Problems catalog — every role reads the library (SPEC §6.3); students submit from here. */
export default async function ProblemsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  
  const isHead = (ROLE_LEVEL[me.role as Role] ?? 1) >= 2;

  const [problems, solved, solvers] = await Promise.all([
    safe(hubFetch<ProblemDto[]>('/problems?limit=200')),
    mySolvedSet(),
    solverMap(),
  ]);

  return <ProblemsBoard problems={problems ?? []} solved={solved} solvers={solvers} myId={me.id} isHead={isHead} />;
}
