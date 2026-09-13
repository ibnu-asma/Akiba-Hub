import { redirect, notFound } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ContestDto, type ContestProblemDto, type Group } from '@/lib/api';
import { mySolvedSet, solverMap } from '@/lib/student';
import { ContestDetailBoard } from '@/components/student/contest-detail-board';

/** Student Contest detail page — Team Completion, Detail Team Completions, and Questions (SPEC §6.8). */
export default async function ContestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect('/login');

  let [contest, problems, solved, solvers, groups] = await Promise.all([
    safe(hubFetch<ContestDto>(`/contests/${id}`)),
    safe(hubFetch<ContestProblemDto[]>(`/contests/${id}/problems`)),
    mySolvedSet(),
    solverMap(),
    safe(hubFetch<Group[]>('/groups')),
  ]);

  if (!contest) {
    // Fallback: search in contest list if direct GET was not supported or cached
    const allContests = (await safe(hubFetch<ContestDto[] | { rows: ContestDto[] }>('/contests?limit=200'))) ?? [];
    const list = Array.isArray(allContests) ? allContests : (allContests.rows ?? []);
    contest = list.find((c) => c.id === id) ?? null;
  }

  if (!contest) notFound();

  // SuperGroup / Group Scoping: Students cannot view contests created for other supergroups
  const isStudent = (ROLE_LEVEL[me.role as Role] ?? 1) === 1;
  if (isStudent && (me.groupId || me.superGroupId)) {
    const matchesGroup = Boolean(me.groupId && contest.groupIds?.includes(me.groupId));
    const matchesSuperGroup = Boolean(me.superGroupId && contest.superGroupIds?.includes(me.superGroupId));
    if (!matchesGroup && !matchesSuperGroup) {
      notFound();
    }
  }

  // Resolve teammates from student's group or contest participating groups
  const myGroup = (groups ?? []).find((g) => g.id === me.groupId);
  let teammates = myGroup?.students && myGroup.students.length > 0 ? myGroup.students : null;

  if (!teammates && contest.groupIds && contest.groupIds.length > 0) {
    const contestGroup = (groups ?? []).find((g) => contest.groupIds.includes(g.id));
    if (contestGroup?.students && contestGroup.students.length > 0) {
      teammates = contestGroup.students;
    }
  }

  if (!teammates || teammates.length === 0) {
    teammates = [{ id: me.id, name: me.name, avatarUrl: me.avatarUrl }];
  }

  return (
    <ContestDetailBoard
      contest={contest}
      problems={problems ?? []}
      solved={solved}
      solvers={solvers}
      teammates={teammates}
      myId={me.id}
    />
  );
}

