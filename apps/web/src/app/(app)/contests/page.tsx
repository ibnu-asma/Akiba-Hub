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
  if ((ROLE_LEVEL[me.role as Role] ?? 1) >= 2) redirect('/contests/new');

  const [contestsPage, solved, solvers] = await Promise.all([
    safe(hubFetch<Paged<ContestDto>>('/contests?limit=50')),
    mySolvedSet(),
    solverMap(),
  ]);

  // Scope contests to student's group or supergroup
  const rawList = contestsPage?.rows ?? [];
  const list = rawList
    .filter((c) => {
      const matchesGroup = Boolean(me.groupId && c.groupIds?.includes(me.groupId));
      const matchesSuperGroup = Boolean(me.superGroupId && c.superGroupIds?.includes(me.superGroupId));
      return matchesGroup || matchesSuperGroup;
    })
    .sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt).getTime();
      const timeB = new Date(b.date || b.createdAt).getTime();
      return timeB - timeA;
    });

  // Fetch each contest's questions (A, B, C…).
  const problemsByContest = await Promise.all(
    list.map(async (contest) => ({
      contestId: contest.id,
      problems: (await safe(hubFetch<ContestProblemDto[]>(`/contests/${contest.id}/problems`))) ?? [],
    })),
  );
  const problemsMap = new Map(problemsByContest.map((p) => [p.contestId, p.problems]));

  return <ContestsBoard contests={list} problemsByContest={problemsMap} solved={solved} solvers={solvers} myId={me.id} />;
}