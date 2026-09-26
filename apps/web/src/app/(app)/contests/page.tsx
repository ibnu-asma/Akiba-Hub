import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ContestDto, type ContestProblemDto } from '@/lib/api';
import { mySolvedSet, solverMap } from '@/lib/student';
import { ContestsBoard } from '@/components/student/contests-board';

interface Paged<T> {
  rows: T[];
  total: number;
}

/** Student Contests — contest cards with their A–E questions (SPEC §6.8). */
export default async function StudentContestsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  
  const isHead = (ROLE_LEVEL[me.role as Role] ?? 1) >= 2;

  const [contestsPage, solved, solvers] = await Promise.all([
    safe(hubFetch<Paged<ContestDto>>('/contests?limit=50')),
    mySolvedSet(),
    solverMap(),
  ]);

  const rawContests = contestsPage?.rows ?? [];

  // Parallel fetch problems for the active contests
  const activeIds = rawContests.map((c) => c.id);
  const probsMap = new Map<string, ContestProblemDto[]>();

  if (activeIds.length > 0) {
    const fetchPromises = activeIds.map((id) =>
      safe(hubFetch<ContestProblemDto[]>(`/contests/${id}/problems`)).then((p) => [id, p] as const),
    );
    const results = await Promise.all(fetchPromises);
    for (const [id, probs] of results) {
      if (probs) probsMap.set(id, probs);
    }
  }

  return (
    <ContestsBoard
      contests={rawContests}
      problemsByContest={probsMap}
      solved={solved}
      solvers={solvers}
      myId={me.id}
      isHead={isHead}
    />
  );
}
