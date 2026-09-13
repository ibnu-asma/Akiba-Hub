import { redirect } from 'next/navigation';
import { getMe, hubFetch, safe, type ProblemDto } from '@/lib/api';
import { mySolvedSet, solverMap } from '@/lib/student';
import { ProblemsBoard } from '@/components/student/problems-board';

/** Problems catalog — every role reads the library (SPEC §6.3); students submit from here. */
export default async function ProblemsPage() {
  const me = await getMe();
  if (!me) redirect('/login');

  const [problems, solved, solvers] = await Promise.all([
    safe(hubFetch<ProblemDto[]>('/problems?limit=200')),
    mySolvedSet(),
    solverMap(),
  ]);

  return <ProblemsBoard problems={problems ?? []} solved={solved} solvers={solvers} myId={me.id} />;
}
