import { redirect } from 'next/navigation';
import { ROLE_LEVEL, ROLE_NAMES, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Activity, type Group, type SessionDto, type SuperGroup, type UserDto } from '@/lib/api';
import { minutesToDays } from '@/lib/format';
import { ActivityFeed, EventsPanel, QuickLink, QuoteBanner, StatCard } from '@/components/dashboard-widgets';

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

  const [sessions] = await Promise.all([safe(hubFetch<SessionDto[]>('/sessions'))]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuoteBanner firstName={firstName} watermark={roleLabel} />
        </div>
        <EventsPanel sessions={sessions} scopeHint="Scheduled by your head of education" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Solutions" value="—" delta={0} spark={[4, 6, 5, 7, 6, 8]} accent="green" hint="Submissions land with the Exercises module" />
        <StatCard label="Time Spent (min)" value="—" delta={0} spark={[3, 5, 4, 6, 5, 7]} accent="blue" hint={minutesToDays(0)} />
        <StatCard label="Rating" value="—" delta={0} spark={[5, 4, 6, 5, 7, 6]} accent="orange" hint="Contest module lands next milestone" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/problems" icon="list" label="Problems" sub="Solve and submit" />
        <QuickLink href="/contests" icon="trophy" label="Contests" sub="Upsolve contest problems" />
        <QuickLink href="/tracks" icon="map" label="Tracks" sub="Your learning path" />
        <QuickLink href="/forum" icon="chat" label="Forum" sub="Discuss with your group" />
      </div>
    </div>
  );
}
