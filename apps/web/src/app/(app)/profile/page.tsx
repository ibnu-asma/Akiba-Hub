import { redirect } from 'next/navigation';
import {
  getMe,
  hubFetch,
  safe,
  type Group,
  type Me,
  type SubmissionDto,
  type UserAttendanceRecord,
  type UserStatsDto,
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
  const targetUserId = userId || me.id;

  // Parallel fetches for profile and metrics
  const [groups, stats, userSubmissions, dbAttendance, consistencySummary] = await Promise.all([
    safe(hubFetch<Group[]>('/groups')),
    safe(hubFetch<UserStatsDto>(`/users/${targetUserId}/stats`)),
    safe(hubFetch<SubmissionDto[]>(`/submissions?userId=${targetUserId}&limit=100`)),
    safe(hubFetch<UserAttendanceRecord[]>(`/sessions/user-attendance?userId=${targetUserId}`)),
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

  // Calculate solved count and minutes (use unpaginated DB stats with fallback)
  const distinctProblems = new Set((userSubmissions ?? []).map((s) => s.problemId));
  const solvedCount = stats?.solvedCount ?? distinctProblems.size;
  const totalMinutes = stats?.totalMinutes ?? (userSubmissions ?? []).reduce((sum, s) => sum + (s.timeSpentMin || 0), 0);

  // Group solves by day for consistency heatmap without double-counting
  const solvesMap = new Map<string, number>();
  const userConsistency = consistencySummary?.find((c) => c.userId === targetUser.id);
  if (userConsistency?.days && userConsistency.days.length > 0) {
    for (const d of userConsistency.days) {
      solvesMap.set(d.day, d.count);
    }
  } else {
    for (const s of userSubmissions ?? []) {
      const day = s.createdAt.slice(0, 10);
      solvesMap.set(day, (solvesMap.get(day) ?? 0) + 1);
    }
  }

  const consistencySolves = Array.from(solvesMap.entries()).map(([day, count]) => ({
    day,
    count,
  }));

  // Combine database attendance with reference cohort schedule
  const combinedAttendance = dbAttendance ?? [];

  // Resolve group and program names
  const groupName = userGroup?.name ?? 'Unassigned';
  const superGroupName = userGroup?.superGroupName ?? 'Unassigned';

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
