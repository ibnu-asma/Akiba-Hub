import { redirect } from 'next/navigation';
import { ROLE_LEVEL, ROLE_NAMES, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Activity, type CompletionRow, type DailyProblemDto, type Group, type SessionDto, type SubmissionDto, type SuperGroup, type UserDto } from '@/lib/api';
import { minutesToDays } from '@/lib/format';
import { mySubmissionStats, mySolvedSet } from '@/lib/student';
import { ActivityFeed, EventsPanel, QuickLink, QuoteBanner, StatCard } from '@/components/dashboard-widgets';
import { DailyProblemCard, TeamCompletionCard } from '@/components/student/dashboard-cards';
import { RecentSolvesList } from '@/components/student/recent-solves';

export default async function DashboardPage() {
  const me = await getMe();
  if (!me) redirect('/login');

  const level = ROLE_LEVEL[me.role as Role] ?? 1;
  const firstName = me.name.split(' ')[0] ?? me.name;
  const roleLabel = ROLE_NAMES[me.role as keyof typeof ROLE_NAMES] ?? me.role;

  // Scope-gated fetches — each degrades to null on failure (dashboard never crashes).
  if (level >= 3) {
    const [superGroups, groups, users, sessions, activities] = await Promise.all([
      safe(hubFetch<SuperGroup[]>('/super-groups')),
      safe(hubFetch<Group[]>('/groups')),
      safe(hubFetch<UserDto[]>('/users')),
      safe(hubFetch<SessionDto[]>('/sessions?all=1')),
      safe(hubFetch<Activity[]>('/activities?limit=8')),
    ]);
    const students = users?.filter((u) => u.role === 'student').length ?? null;

    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuoteBanner firstName={firstName} watermark={roleLabel} />
          </div>
          <EventsPanel sessions={sessions} scopeHint="Academy-wide schedule" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="SuperGroup Solutions" value="—" delta={0} spark={[4, 6, 5, 7, 6, 8]} accent="green" hint="Submissions land with the Exercises module" />
          <StatCard label="SuperGroup Time Spent (min)" value="—" delta={0} spark={[3, 5, 4, 6, 5, 7]} accent="blue" hint={minutesToDays(0)} />
          <StatCard label="SuperGroup Rating" value="—" delta={0} spark={[5, 4, 6, 5, 7, 6]} accent="orange" hint="Contest module lands next milestone" />
        </div>
        {activities && <ActivityFeed activities={activities} />}
      </div>
    );
  }

  if (level === 2) {
    const [groups, users, sessions] = await Promise.all([
      safe(hubFetch<Group[]>('/groups')),
      safe(hubFetch<UserDto[]>('/users')),
      safe(hubFetch<SessionDto[]>('/sessions')),
    ]);
    const students = users?.filter((u) => u.role === 'student').length ?? null;

    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuoteBanner firstName={firstName} watermark={roleLabel} />
          </div>
          <EventsPanel sessions={sessions} scopeHint="Sessions for your groups" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Team Solutions" value="—" delta={0} spark={[4, 6, 5, 7, 6, 8]} accent="green" hint="Submissions land with the Exercises module" />
          <StatCard label="Team Time Spent (min)" value="—" delta={0} spark={[3, 5, 4, 6, 5, 7]} accent="blue" hint={minutesToDays(0)} />
          <StatCard label="Team Rating" value="—" delta={0} spark={[5, 4, 6, 5, 7, 6]} accent="orange" hint="Contest module lands next milestone" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/attendance" icon="calendar" label="Take attendance" sub="Mark today's roster" />
          <QuickLink href="/sessions/new" icon="plus" label="Add session" sub="Schedule a class or event" />
          <QuickLink href="/daily-problem" icon="list" label="Daily problem" sub="Manage the challenge queue" />
          <QuickLink href="/summary" icon="chart" label="Summary" sub="Attendance · consistency · more" />
        </div>
      </div>
    );
  }

  const [sessions, recentSolves, daily, completion, exercise, solved] = await Promise.all([
    safe(hubFetch<SessionDto[]>('/sessions')),
    safe(hubFetch<SubmissionDto[]>('/submissions?group=1&limit=10')),
    safe(hubFetch<DailyProblemDto[]>('/daily-problems?limit=20')),
    safe(hubFetch<CompletionRow[]>('/summary/completion')),
    safe(hubFetch<{ problems: { id: string; name: string; difficulty: string }[]; students: { userId: string; name: string; cells: Record<string, { attempts: number; minutes: number }> }[] }>('/summary/exercise')),
    mySolvedSet(),
  ]);

  const stats = await mySubmissionStats();

  // Today's daily problem for my super group (latest dated ≤ today).
  const today = new Date().toISOString().slice(0, 10);
  const myDaily = (daily ?? [])
    .filter((d) => me.superGroupId == null || d.superGroupId === me.superGroupId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .find((d) => d.date <= today);

  // Peer counter for the daily card — teammates with a cell for this problem.
  const teammates = exercise?.students ?? [];
  const myRow = completion?.find((r) => r.userId === me.id) ?? null;
  const solvedByTeammates = myDaily ? teammates.filter((s) => s.cells[myDaily.problemId]).length : undefined;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuoteBanner firstName={firstName} watermark={roleLabel} />
        </div>
        <EventsPanel sessions={sessions} scopeHint="Scheduled by your head of education" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Solutions" value={String(stats.count)} delta={Math.min(99, stats.count * 2)} spark={[3, 5, 4, 6, 5, 8]} accent="green" hint={`${stats.runs} total attempts logged`} />
        <StatCard label="Time Spent (min)" value={String(stats.minutes)} delta={Math.min(99, Math.round(stats.minutes / 12))} spark={[4, 3, 6, 5, 7, 6]} accent="blue" hint={minutesToDays(stats.minutes)} />
        <StatCard label="Rating" value={String(me.rating ?? 1200)} delta={4.2} spark={[5, 4, 6, 5, 7, 7]} accent="orange" hint="Contest performance updates your rating" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyProblemCard daily={myDaily ?? null} solved={myDaily ? solved.has(myDaily.problemId) : false} solvedByTeammates={solvedByTeammates} teammateCount={teammates.filter((s) => s.userId !== me.id).length + (myRow ? 1 : 0)} />
        <TeamCompletionCard rows={completion ?? []} myId={me.id} />
      </div>

      <RecentSolvesList submissions={recentSolves ?? []} />
    </div>
  );
}
