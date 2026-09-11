import Link from 'next/link';
import { Icon } from '@/components/icon';
import { formatDate, formatDateTime, quoteOfTheDay, timeAgo } from '@/lib/format';
import type { Activity, SessionDto } from '@/lib/api';

export function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`h-10 w-1.5 rounded-full ${accent}`} />
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

/** Quote banner (SPEC §6.1/§7.2/§8.1) with the Problems CTA. */
export function QuoteBanner({ firstName }: { firstName: string }) {
  const quote = quoteOfTheDay();
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-a2sv-600 via-a2sv-500 to-a2sv-400 p-6 text-white shadow-sm md:p-8">
      <p className="max-w-xl text-lg font-medium leading-relaxed">“{quote.text}”</p>
      <p className="mt-1.5 text-sm text-a2sv-100">— {quote.author}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">Welcome back, {firstName}!</p>
        <Link
          href="/problems"
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-a2sv-700 shadow-sm transition hover:bg-a2sv-50"
        >
          Problems
        </Link>
      </div>
    </section>
  );
}

export function EventsPanel({ sessions, scopeHint }: { sessions: SessionDto[] | null; scopeHint?: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sessions?.filter((s) => s.date >= today).slice(0, 4) ?? [];

  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-bold text-slate-900">Events</h2>
      {upcoming.length === 0 ? (
        <p className="py-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-300">
          No new event
        </p>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((session) => (
            <li key={session.id} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-a2sv-50 text-a2sv-600">
                <Icon name="calendar" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{session.name}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(session.date)}
                  {session.startTime ? ` · ${session.startTime}` : ''}
                  {session.location ? ` · ${session.location}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {scopeHint && <p className="mt-3 text-[11px] text-slate-400">{scopeHint}</p>}
    </section>
  );
}

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-a2sv-50 text-a2sv-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-700',
};

/** Recent Actions feed (SPEC §8.8) — actor + role badge + action chip + description. */
export function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Recent Actions</h2>
        <Link href="/activities" className="text-xs font-semibold text-a2sv-600 hover:underline">
          View all
        </Link>
      </div>
      {activities.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No activity recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-start gap-3 rounded-xl bg-a2sv-50/60 p-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-a2sv-500 text-[11px] font-bold text-white">
                ✓
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-900">{activity.actorName}</span>
                  <span className="chip bg-slate-200 text-slate-600">{activity.actorRole}</span>
                  <span className={`chip ${ACTION_STYLES[activity.action] ?? 'bg-slate-100 text-slate-600'}`}>
                    {activity.action}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(activity.createdAt)}</span>
                </p>
                <p className="mt-0.5 truncate text-sm text-slate-600">{activity.description}</p>
                <p className="text-[11px] text-slate-400">{formatDateTime(activity.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function QuickLink({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  sub: string;
}) {
  return (
    <Link href={href} className="card flex items-center gap-3 p-4 transition hover:border-a2sv-300 hover:shadow">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-a2sv-50 text-a2sv-600">
        <Icon name={icon} />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </Link>
  );
}
