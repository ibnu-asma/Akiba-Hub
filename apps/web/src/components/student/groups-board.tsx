'use client';

import { Icon } from '@/components/icon';
import type { Group, Me } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

function Avatar({ name, url, size = 'h-10 w-10 text-sm' }: { name: string; url: string | null; size?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${size} shrink-0 rounded-full object-cover`} />;
  }
  return <span className={`${size} grid shrink-0 place-items-center rounded-full bg-a2sv-100 font-bold text-a2sv-700`}>{initials(name)}</span>;
}

/** Student Groups & Users — my group card + roster (SPEC §6.10). */
export function GroupsBoard({ groups, me }: { groups: Group[]; me: Me }) {
  const mine = groups.find((g) => g.id === me.groupId) ?? null;
  const siblings = mine?.superGroupId ? groups.filter((g) => g.superGroupId === mine.superGroupId && g.id !== mine.id) : [];

  if (!mine) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Groups &amp; Users</h1>
        </header>
        <section className="card p-10 text-center">
          <p className="text-3xl">👥</p>
          <p className="mt-2 text-sm text-slate-500">
            You&apos;re not in a group yet — ask your Head of Academy to assign you.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Groups &amp; Users</h1>
        <p className="mt-1 text-sm text-slate-500">Your team — the people you learn, solve, and compete with.</p>
      </header>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-a2sv-500 text-lg font-black text-white">
              {mine.shortName}
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{mine.name}</h2>
              <p className="text-sm text-slate-500">
                {mine.superGroupName ?? 'No program'}{mine.country ? ` · ${mine.country}` : ''} · {mine.studentCount} student{mine.studentCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mine.heads.map((h) => (
              <span key={h.id} className="chip bg-a2sv-50 text-a2sv-700">
                <Icon name="shield" className="mr-1 h-3.5 w-3.5" />
                {h.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Roster ({mine.studentCount})</h3>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.students.map((student) => (
            <li key={student.id} className={`card flex items-center gap-3 p-4 ${student.id === me.id ? 'border-a2sv-300 bg-a2sv-50/40' : ''}`}>
              <Avatar name={student.name} url={student.avatarUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {student.name}
                  {student.id === me.id && <span className="ml-2 text-xs font-medium text-a2sv-600">(you)</span>}
                </p>
                <p className="text-xs text-slate-400">Student</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {siblings.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Other groups in {mine.superGroupName ?? 'your program'}
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.map((g) => (
              <li key={g.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                    {g.shortName}
                  </span>
                  <span className="chip bg-slate-100 text-slate-500">{g.studentCount}</span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-slate-800">{g.name}</p>
                <p className="text-xs text-slate-400">{g.heads.map((h) => h.name).join(', ') || 'No head assigned'}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}