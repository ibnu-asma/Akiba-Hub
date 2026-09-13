import Link from 'next/link';
import { formatDateTime } from '@/lib/format';
import type { Activity, SessionDto } from '@/lib/api';
import { Icon } from '@/components/icon';
export { QuoteBanner } from '@/components/quote-banner';

export type StatAccent = 'green' | 'blue' | 'orange';

const ACCENTS: Record<StatAccent, string> = {
  green: '#059669',
  blue: '#2563eb',
  orange: '#ea580c',
};

/** Compact inline SVG sparkline matching the spec accent colors. */
export function Sparkline({ points, color = '#059669' }: { points: number[]; color?: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 80;
  const height = 32;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * (height - 6) - 3;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Stat card with trend indicator and sparkline. */
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
    <div className="card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="delta-pill font-semibold">
          <Icon name="trend" className="h-3.5 w-3.5" />
          {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
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

function parseTimeString(timeStr?: string | null): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const s = timeStr.trim().toLowerCase();
  const match = s.match(/(\d{1,2}):(\d{2})(?:\s*(am|pm))?/);
  if (!match) return null;
  let hours = parseInt(match[1]!, 10);
  const minutes = parseInt(match[2]!, 10);
  const modifier = match[3];
  if (modifier === 'pm' && hours < 12) hours += 12;
  if (modifier === 'am' && hours === 12) hours = 0;
  return { hours, minutes };
}

function getSessionEndTime(session: SessionDto): Date {
  if (!session.date) return new Date(8640000000000000);
  const dateStr = session.date.slice(0, 10);
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  if (session.endTime) {
    const t = parseTimeString(session.endTime);
    if (t) {
      return new Date(y, m - 1, d, t.hours, t.minutes, 0);
    }
  }
  if (session.startTime) {
    const t = parseTimeString(session.startTime);
    if (t) {
      return new Date(y, m - 1, d, t.hours + 2, t.minutes, 0);
    }
  }
  return new Date(y, m - 1, d, 23, 59, 59);
}

function getSessionStartTime(session: SessionDto): Date {
  if (!session.date) return new Date(0);
  const dateStr = session.date.slice(0, 10);
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  if (session.startTime) {
    const t = parseTimeString(session.startTime);
    if (t) {
      return new Date(y, m - 1, d, t.hours, t.minutes, 0);
    }
  }
  return new Date(y, m - 1, d, 0, 0, 0);
}

function extractMeetingLink(session: SessionDto): string | null {
  const candidates = [session.location, session.resourceLink, session.description].filter(Boolean) as string[];
  for (const text of candidates) {
    const match = text.match(/(https?:\/\/[^\s]+|meet\.google\.com\/[a-z0-9-]+|zoom\.us\/j\/[a-z0-9-]+)/i);
    if (match) {
      const url = match[1]!;
      return url.startsWith('http') ? url : `https://${url}`;
    }
  }
  return null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Events card — nearest upcoming/ongoing events on top, filters out ended sessions, clickable meet links. */
export function EventsPanel({ sessions, scopeHint }: { sessions: SessionDto[] | null; scopeHint?: string }) {
  const now = new Date();

  // Exclude sessions where end time has passed
  const activeSessions = (sessions ?? []).filter((s) => getSessionEndTime(s) >= now);

  // Sort chronologically ascending (nearest event on top)
  activeSessions.sort((a, b) => getSessionStartTime(a).getTime() - getSessionStartTime(b).getTime());

  const upcoming = activeSessions.slice(0, 4);

  return (
    <section className="card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-900">Upcoming Events</h2>
        {upcoming.length > 0 && (
          <span className="text-[11px] font-semibold text-slate-400">
            {upcoming.length} {upcoming.length === 1 ? 'event' : 'events'}
          </span>
        )}
      </div>

      {upcoming.length === 0 ? (
        <div className="my-auto py-8 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400">
            <Icon name="calendar" className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">No Upcoming Events</p>
          <p className="mt-0.5 text-xs text-slate-400">All past sessions have ended. Next events will show here.</p>
        </div>
      ) : (
        <ul className="space-y-3 flex-1">
          {upcoming.map((session) => {
            const startTime = getSessionStartTime(session);
            const endTime = getSessionEndTime(session);
            const isLive = startTime <= now && endTime >= now;
            const meetLink = extractMeetingLink(session);
            const monthStr = MONTH_NAMES[startTime.getMonth()] ?? 'Date';
            const dayNum = startTime.getDate();

            return (
              <li
                key={session.id}
                className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Date badge */}
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-white border border-slate-200 shadow-2xs text-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-a2sv-600 leading-none">
                      {monthStr}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 leading-tight mt-0.5">
                      {dayNum}
                    </span>
                  </div>

                  {/* Event content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="truncate text-sm font-bold text-slate-800 leading-snug">
                        {session.name}
                      </p>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live Now
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="clock" className="h-3 w-3 text-slate-400" />
                        {session.startTime ?? 'TBD'}
                        {session.endTime ? ` – ${session.endTime}` : ''}
                      </span>
                      {session.lecturer && (
                        <span className="text-slate-400">· {session.lecturer}</span>
                      )}
                    </p>

                    {/* Google Meet / Location action */}
                    {meetLink ? (
                      <div className="mt-2.5">
                        <a
                          href={meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-2xs transition-all cursor-pointer"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                          </svg>
                          <span>Join Meeting</span>
                          <Icon name="externalLink" className="h-3 w-3 opacity-80" />
                        </a>
                      </div>
                    ) : session.location ? (
                      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                        <Icon name="map" className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{session.location}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {scopeHint && <p className="mt-3 text-[11px] text-slate-400">{scopeHint}</p>}
    </section>
  );
}

/** Activity feed — recent actions across the scope (HoA only). */
export function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <section className="card p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Recent Actions</h2>
        <Link href="/activities" className="text-xs font-semibold text-a2sv-600 hover:underline">
          View all →
        </Link>
      </div>
      {activities.length === 0 ? (
        <p className="text-xs text-slate-400">No actions recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity) => (
            <li key={activity.id} className="card-tint p-3.5 rounded-xl">
              <p className="text-xs font-semibold text-a2sv-700">
                {activity.action} - {formatDateTime(activity.createdAt)}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {activity.entityType} · {activity.entityId}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** HoE dashboard quick link card. */
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
    <Link
      href={href}
      className="card flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs transition hover:border-a2sv-300 hover:shadow-sm"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-a2sv-50 text-a2sv-600">
        <Icon name={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="truncate text-xs text-slate-400">{sub}</p>
      </div>
    </Link>
  );
}
