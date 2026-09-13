import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ROLE_BADGES, ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Activity } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Icon } from '@/components/icon';

/** Audit entityType → a route that resolves to a real page today (avoids dead links). */
const ENTITY_LINKS: Record<string, string> = {
  fund: '/stipends',
  stipend: '/stipends',
  supergroup: '/super-groups',
  'daily-problem': '/daily-problem',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** HoA: Recent Actions — chronological audit feed of everything across the academy (SPEC §8.8). */
export default async function ActivitiesPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  const activities = (await safe(hubFetch<Activity[]>('/activities?limit=100'))) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recent Actions</h1>
        <p className="mt-1 text-sm text-slate-500">
          A chronological feed of everything happening across the academy.
        </p>
      </header>

      {activities.length === 0 ? (
        <section className="card p-10 text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-2 text-sm text-slate-500">No activity recorded yet.</p>
        </section>
      ) : (
        <ol className="space-y-3">
          {activities.map((activity) => {
            const link = ENTITY_LINKS[activity.entityType];
            return (
              <li key={activity.id} className="card-tint flex items-start gap-3 p-4">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-a2sv-500 text-white">
                  <Icon name="checkCircle" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="avatar h-7 w-7 text-[10px]">{initials(activity.actorName)}</span>
                    <span className="truncate text-sm font-semibold text-slate-800">{activity.actorName}</span>
                    <span className="chip bg-white text-slate-500">
                      {ROLE_BADGES[activity.actorRole as Role] ?? activity.actorRole}
                    </span>
                    <span className="chip bg-a2sv-50 text-a2sv-700">{activity.action}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">
                    {link ? (
                      <Link href={link} className="font-medium text-a2sv-700 hover:underline">
                        {activity.description}
                      </Link>
                    ) : (
                      activity.description
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDateTime(activity.createdAt)} · {activity.entityType}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
