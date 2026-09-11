import Link from 'next/link';
import { Icon } from '@/components/icon';
import { Sparkline } from '@/components/sparkline';
import { formatDate, formatDateTime, quoteOfTheDay, timeAgo } from '@/lib/format';
import type { Activity, SessionDto } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/* Stat-card accent palette — mirrors the dashboard screenshots (green/blue/orange bars). */
const ACCENTS = {
  green: '#0FA958',
  blue: '#2563EB',
  orange: '#F59E0B',
} as const;

export type StatAccent = keyof typeof ACCENTS;

/** Stat card — label, green delta pill, big value, hint, colored bar sparkline. */
export function StatCard({
  label,
  value,
  suffix,
  hint,
  delta = 0,
  spark = [4, 7, 5, 8, 6, 9],
  accent = 'green',
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  delta?: number;
  spark?: number[];
  accent?: StatAccent;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="delta-pill">
          <Icon name="trend" className="h-3.5 w-3.5" />
          {delta.toFixed(1)}%
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-3xl font-bold tracking-tight text-slate-900">
            {value}
            {suffix && <span className="ml-1 text-base font-semibold text-slate-400">{suffix}</span>}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <Sparkline points={spark} color={ACCENTS[accent]} />
      </div>
    </div>
  );
}

/** Quote banner — light-green gradient, giant role watermark, Problems CTA. */
export function QuoteBanner({ firstName, watermark }: { firstName: string; watermark?: string }) {
  const quote = quoteOfTheDay();
  return (
    <section className="relative overflow-hidden rounded-[1.25rem] border border-a2sv-200 bg-gradient-to-br from-banner-from to-banner-to p-6 md:p-8">
      {watermark && (
        <span
          aria-hidden="true"
          className="absolute -right-2 top-3 hidden max-w-[60%] select-none text-right text-[2.6rem] font-bold uppercase leading-none tracking-tight text-a2sv-500/25 md:block lg:text-[3.4rem]"
        >
          {watermark}
        </span>
      )}
      <div className="relative max-w-2xl">
        <p className="text-lg font-semibold leading-snug text-slate-800">“{quote.text}”</p>
        <p className="mt-1 text-sm text-slate-600">— {quote.author}</p>
        <p className="mt-5 text-sm font-medium text-slate-700">Welcome back, {firstName}!</p>
        <Link href="/problems" className="btn-primary mt-3 px-6">
          Problems
        </Link>
      </div>
      <span aria-hidden="true" className="absolute bottom-4 right-5 text-3xl md:text-4xl">
        🚀
      </span>
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
        <div className="py-6 text-center">
          <span aria-hidden="true" className="text-3xl">
            🚀
          </span>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-300">No new event</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((session) => (
            <li key={session.id} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-a2sv-50 text-a2sv-600">
                <Icon name="calendar" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{session.name}</p>
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

/** Recent Actions feed — light-green cards, green action·timestamp header (SPEC §8.8). */
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
            <li key={activity.id} className="card-tint p-3.5">
              <p className="text-xs font-semibold text-a2sv-700">
                {activity.action} - {formatDateTime(activity.createdAt)}
              </p>
              <div className="mt-2 flex items-center gap-2.5">
                <span className="avatar h-8 w-8 text-[10px]">
                  {initials(activity.actorName)}
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-status-present" />
                </span>
                <p className="truncate text-sm font-medium text-slate-700">{activity.actorName}</p>
                <span className="chip bg-white text-slate-500">{activity.actorRole}</span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">{activity.description}</p>
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
    <Link href={href} className="card flex items-center gap-3 p-4 transition hover:border-a2sv-300">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-a2sv-50 text-a2sv-600">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
    </Link>
  );
}
