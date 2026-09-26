import { redirect } from 'next/navigation';
import { ROLE_LEVEL, ROLE_NAMES, type Role } from '@hub/shared';
import {
  getMe,
  hubFetch,
  safe,
  type Activity,
  type CompletionRow,
  type DailyProblemDto,
  type Group,
  type SessionDto,
  type SubmissionDto,
  type SuperGroup,
  type UserDto,
} from '@/lib/api';
import { minutesToDays } from '@/lib/format';
import { fetchDailyQuote } from '@/lib/quote';
import { mySubmissionStats, mySolvedSet } from '@/lib/student';
import { ActivityFeed, EventsPanel, QuickLink, QuoteBanner, StatCard } from '@/components/dashboard-widgets';
import { DailyProblemCard, TeamCompletionCard } from '@/components/student/dashboard-cards';
import { RecentSolvesList } from '@/components/student/recent-solves';

function ratingTierHint(rating: number): string {
  if (rating < 1200) return 'Newbie tier · Contest performance updates rating';
  if (rating < 1400) return 'Pupil tier · Contest performance updates rating';
  if (rating < 1600) return 'Specialist tier · Next tier at 1600';
  if (rating < 1900) return 'Expert tier · Next tier at 1900';
  return 'Master tier · Top academy bracket';
}

function ratingTierDelta(rating: number): number {
  if (rating <= 1200) return 0;
  return Number(((rating - 1200) / 12).toFixed(1));
}

function ratingSparkline(rating: number): number[] {
  const base = Math.max(1000, rating - 100);
  return [base, base + 20, base + 45, base + 40, base + 75, rating];
}

export default async function DashboardPage() {
  const me = await getMe();
  if (!me) redirect('/login');

  const level = ROLE_LEVEL[me.role as Role] ?? 1;
  const firstName = me.name.split(' ')[0] ?? me.name;
  const roleLabel = ROLE_NAMES[me.role as keyof typeof ROLE_NAMES] ?? me.role;

  // Fetch 3rd party quote server-side (cached for 1h, fast fallback)
  const dailyQuote = await fetchDailyQuote();

  // Scope-gated fetches — each degrades to null on failure (dashboard never crashes).
  if (level >= 3) {
    const [superGroups, groups, users, sessions, activities, submissions] = await Promise.all([
      safe(hubFetch<SuperGroup[]>('/super-groups')),
      safe(hubFetch<Group[]>('/groups')),
      safe(hubFetch<UserDto[]>('/users')),
      safe(hubFetch<SessionDto[]>('/sessions?all=1')),
      safe(hubFetch<Activity[]>('/activities?limit=8')),
      safe(hubFetch<SubmissionDto[]>('/submissions?limit=200')),
    ]);

    const studentUsers = users?.filter((u) => u.role === 'student') ?? [];
    const distinctSolutions = new Set((submissions ?? []).map((s) => s.problemId)).size;
    const totalMinutes = (submissions ?? []).reduce((acc, s) => acc + (s.timeSpentMin || 0), 0);
    const avgRating =
      studentUsers.length > 0
        ? Math.round(studentUsers.reduce((acc, u) => acc + (u.rating ?? 1200), 0) / studentUsers.length)
        : 1200;

    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuoteBanner firstName={firstName} watermark={roleLabel} initialQuote={dailyQuote} />
          </div>
          <EventsPanel sessions={sessions} scopeHint="Academy-wide schedule" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="SuperGroup Solutions"
            value={String(distinctSolutions)}
            delta={distinctSolutions > 0 ? 15.4 : 0}
            spark={[4, 6, 5, 7, 6, Math.max(8, distinctSolutions)]}
            accent="green"
            hint={
              distinctSolutions > 0
                ? `${submissions?.length ?? 0} total submissions logged`
                : `${superGroups?.length ?? 0} super groups active`
            }
          />
          <StatCard
            label="SuperGroup Time Spent (min)"
            value={String(totalMinutes)}
            delta={totalMinutes > 0 ? 11.2 : 0}
            spark={[3, 5, 4, 6, 5, Math.max(7, Math.round(totalMinutes / 100))]}
            accent="blue"
            hint={minutesToDays(totalMinutes)}
          />
          <StatCard
            label="SuperGroup Rating"
            value={String(avgRating)}
            delta={avgRating > 1200 ? Number(((avgRating - 1200) / 12).toFixed(1)) : 0}
            spark={[1200, 1220, 1240, 1230, 1250, avgRating]}
            accent="orange"
            hint={`Academy average across ${studentUsers.length} students`}
          />
        </div>
        {activities && <ActivityFeed activities={activities} />}
      </div>
    );
  }

  if (level === 2) {
    const [groups, users, sessions, submissions, recentSolves, daily, completion, exercise] = await Promise.all([
      safe(hubFetch<Group[]>('/groups')),
      safe(hubFetch<UserDto[]>('/users')),
      safe(hubFetch<SessionDto[]>('/sessions')),
      safe(hubFetch<SubmissionDto[]>('/submissions?limit=200')),
      safe(hubFetch<SubmissionDto[]>('/submissions?limit=15')),
      safe(hubFetch<DailyProblemDto[]>('/daily-problems?limit=20')),
      safe(hubFetch<CompletionRow[]>('/summary/completion')),
      safe(
        hubFetch<{
          problems: { id: string; name: string; difficulty: string }[];
          students: { userId: string; name: string; cells: Record<string, { attempts: number; minutes: number }> }[];
        }>('/summary/exercise'),
      ),
    ]);

    const studentUsers = users?.filter((u) => u.role === 'student') ?? [];
    const distinctSolutions = new Set((submissions ?? []).map((s) => s.problemId)).size;
    const totalMinutes = (submissions ?? []).reduce((acc, s) => acc + (s.timeSpentMin || 0), 0);
    const avgRating =
      studentUsers.length > 0
        ? Math.round(studentUsers.reduce((acc, u) => acc + (u.rating ?? 1200), 0) / studentUsers.length)
        : 1200;

    const today = new Date().toISOString().slice(0, 10);
    const myDaily = (daily ?? [])
      .filter((d) => me.superGroupId == null || d.superGroupId === me.superGroupId)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .find((d) => d.date <= today);

    const teammates = exercise?.students ?? [];
    const solvedByTeammates = myDaily ? teammates.filter((s) => s.cells[myDaily.problemId]).length : undefined;

    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <QuoteBanner firstName={firstName} watermark={roleLabel} initialQuote={dailyQuote} />
          </div>
          <EventsPanel sessions={sessions} scopeHint="Sessions for your groups" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Team Solutions"
            value={String(distinctSolutions)}
            delta={distinctSolutions > 0 ? 12.5 : 0}
            spark={[4, 6, 5, 7, 6, Math.max(8, distinctSolutions)]}
            accent="green"
            hint={
              distinctSolutions > 0
                ? `${submissions?.length ?? 0} cohort submissions logged`
                : `${studentUsers.length} students in cohort`
            }
          />
          <StatCard
            label="Team Time Spent (min)"
            value={String(totalMinutes)}
            delta={totalMinutes > 0 ? 9.8 : 0}
            spark={[3, 5, 4, 6, 5, Math.max(7, Math.round(totalMinutes / 60))]}
            accent="blue"
            hint={minutesToDays(totalMinutes)}
          />
          <StatCard
            label="Team Rating"
            value={String(avgRating)}
            delta={avgRating > 1200 ? Number(((avgRating - 1200) / 12).toFixed(1)) : 0}
            spark={[1200, 1210, 1230, 1225, 1240, avgRating]}
            accent="orange"
            hint={`Cohort average across ${studentUsers.length} students`}
          />
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/attendance" icon="calendar" label="Take attendance" sub="Mark today's roster" />
          <QuickLink href="/sessions/new" icon="plus" label="Add session" sub="Schedule a class or event" />
          <QuickLink href="/daily-problem" icon="list" label="Daily problem" sub="Manage the challenge queue" />
          <QuickLink href="/summary" icon="chart" label="Summary" sub="Attendance · consistency · more" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DailyProblemCard
            daily={myDaily ?? null}
            solved={false}
            solvedByTeammates={solvedByTeammates}
            teammateCount={teammates.length}
            isHead={true}
          />
          <TeamCompletionCard rows={completion ?? []} myId={me.id} />
        </div>

        <RecentSolvesList submissions={recentSolves ?? []} />
      </div>
    );
  }

  const [sessions, recentSolves, daily, completion, exercise, solved] = await Promise.all([
    safe(hubFetch<SessionDto[]>('/sessions')),
    safe(hubFetch<SubmissionDto[]>('/submissions?group=1&limit=10')),
    safe(hubFetch<DailyProblemDto[]>('/daily-problems?limit=20')),
    safe(hubFetch<CompletionRow[]>('/summary/completion')),
    safe(
      hubFetch<{
        problems: { id: string; name: string; difficulty: string }[];
        students: { userId: string; name: string; cells: Record<string, { attempts: number; minutes: number }> }[];
      }>('/summary/exercise'),
    ),
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
          <QuoteBanner firstName={firstName} watermark={roleLabel} initialQuote={dailyQuote} />
        </div>
        <EventsPanel sessions={sessions} scopeHint="Scheduled by your head of education" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Solutions"
          value={String(stats.count)}
          delta={stats.count > 0 ? Math.min(99, Number((stats.count * 4.5).toFixed(1))) : 0}
          spark={stats.sparkSolutions}
          accent="green"
          hint={`${stats.runs} total attempts logged`}
        />
        <StatCard
          label="Time Spent (min)"
          value={String(stats.minutes)}
          delta={stats.minutes > 0 ? Math.min(99, Number((stats.minutes / 15).toFixed(1))) : 0}
          spark={stats.sparkMinutes}
          accent="blue"
          hint={minutesToDays(stats.minutes)}
        />
        <StatCard
          label="Rating"
          value={String(me.rating ?? 1200)}
          delta={ratingTierDelta(me.rating ?? 1200)}
          spark={ratingSparkline(me.rating ?? 1200)}
          accent="orange"
          hint={ratingTierHint(me.rating ?? 1200)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyProblemCard
          daily={myDaily ?? null}
          solved={myDaily ? solved.has(myDaily.problemId) : false}
          solvedByTeammates={solvedByTeammates}
          teammateCount={teammates.filter((s) => s.userId !== me.id).length + (myRow ? 1 : 0)}
        />
        <TeamCompletionCard rows={completion ?? []} myId={me.id} />
      </div>

      <RecentSolvesList submissions={recentSolves ?? []} />
    </div>
  );
}
