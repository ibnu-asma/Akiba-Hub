import { redirect } from 'next/navigation';
import {
  getMe,
  hubFetch,
  safe,
  type Group,
  type Me,
  type SubmissionDto,
  type UserAttendanceRecord,
} from '@/lib/api';
import { ProfileView } from '@/components/profile/profile-view';
import type { ConsistencyRow } from '@/components/summary/types';



export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ userId?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect('/login');

  const { userId } = (await searchParams) ?? {};
  const isViewingSelf = !userId || userId === me.id;

  // Parallel fetches for profile and metrics
  const [groups, submissions, dbAttendance, consistencySummary] = await Promise.all([
    safe(hubFetch<Group[]>('/groups')),
    safe(hubFetch<SubmissionDto[]>('/submissions?limit=200')),
    safe(hubFetch<UserAttendanceRecord[]>(`/sessions/user-attendance?userId=${userId || me.id}`)),
    safe(hubFetch<ConsistencyRow[]>('/summary/consistency')),
  ]);

  let targetUser = me;
  let userGroup = groups?.find((g) => g.id === me.groupId) ?? null;

  if (!isViewingSelf && userId) {
    const fetchedUser = await safe(hubFetch<Me>(`/users/${userId}`));
    if (fetchedUser) {
      targetUser = fetchedUser;
      userGroup = groups?.find((g) => g.id === fetchedUser.groupId) ?? null;
    } else {
      // Fallback: locate student in group roster
      for (const g of groups ?? []) {
        const found = g.students.find((s) => s.id === userId);
        if (found) {
          targetUser = {
            ...me,
            id: found.id,
            name: found.name,
            email: `${found.name.toLowerCase().replace(/\s+/g, '.')}@akibatech.com`,
            avatarUrl: found.avatarUrl,
            groupId: g.id,
            role: 'student',
          };
          userGroup = g;
          break;
        }
      }
    }
  }

  // Calculate solved count and minutes
  const mySubmissions = (submissions ?? []).filter((s) => s.userId === targetUser.id);
  const distinctProblems = new Set(mySubmissions.map((s) => s.problemId));
  const solvedCount = distinctProblems.size;
  const totalMinutes = mySubmissions.reduce((sum, s) => sum + (s.timeSpentMin || 0), 0);

  // Group solves by day for consistency heatmap
  const solvesMap = new Map<string, number>();
  for (const s of mySubmissions) {
    const day = s.createdAt.slice(0, 10);
    solvesMap.set(day, (solvesMap.get(day) ?? 0) + 1);
  }

  // Add historical consistency from summary if present
  const userConsistency = consistencySummary?.find((c) => c.userId === targetUser.id);
  if (userConsistency?.days) {
    for (const d of userConsistency.days) {
      solvesMap.set(d.day, (solvesMap.get(d.day) ?? 0) + d.count);
    }
  }



  const consistencySolves = Array.from(solvesMap.entries()).map(([day, count]) => ({
    day,
    count,
  }));

  const combinedAttendance = dbAttendance ?? [];

  // Resolve group and program names
  const groupName = userGroup?.name ?? 'Remote Group 4';
  const superGroupName = userGroup?.superGroupName ?? 'G1 Akiba - Remote';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <ProfileView
        targetUser={targetUser}
        groupName={groupName}
        superGroupName={superGroupName}
        isViewingSelf={isViewingSelf}
        solvedCount={solvedCount}
        totalMinutes={totalMinutes}
        attendanceRecords={combinedAttendance}
        consistencySolves={consistencySolves}
      />
    </div>
  );
}
