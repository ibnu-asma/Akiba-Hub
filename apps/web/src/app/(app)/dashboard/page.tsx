import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Activity, type Group, type SessionDto, type SuperGroup, type UserDto } from '@/lib/api';
import { minutesToDays } from '@/lib/format';
import { ActivityFeed, EventsPanel, QuickLink, QuoteBanner, StatCard } from '@/components/dashboard-widgets';

export default async function DashboardPage() {
  const me = await getMe();
  if (!me) redirect('/login');

  const level = ROLE_LEVEL[me.role as Role] ?? 1;
  const firstName = me.name.split(' ')[0] ?? me.name;

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
            <QuoteBanner firstName={firstName} />
          </div>
          <EventsPanel sessions={sessions} scopeHint="Academy-wide schedule" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Super Groups" value={String(superGroups?.length ?? '—')} accent="bg-a2sv-500" />
          <StatCard label="Groups" value={String(groups?.length ?? '—')} accent="bg-blue-500" />
          <StatCard label="Students" value={students !== null ? String(students) : '—'} accent="bg-amber-500" />
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
            <QuoteBanner firstName={firstName} />
          </div>
          <EventsPanel sessions={sessions} scopeHint="Sessions for your groups" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Groups" value={String(groups?.length ?? '—')} accent="bg-a2sv-500" />
          <StatCard label="Students" value={students !== null ? String(students) : '—'} accent="bg-blue-500" />
          <StatCard label="Sessions" value={String(sessions?.length ?? '—')} accent="bg-amber-500" />
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

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuoteBanner firstName={firstName} />
        </div>
        <EventsPanel sessions={null} scopeHint="Events appear once your head schedules a session" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Solutions" value="—" hint="Submissions module lands next milestone" accent="bg-a2sv-500" />
        <StatCard label="Time Spent" value="—" hint={minutesToDays(0)} accent="bg-blue-500" />
        <StatCard label="Rating" value="—" hint="Contest module lands next milestone" accent="bg-amber-500" />
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
