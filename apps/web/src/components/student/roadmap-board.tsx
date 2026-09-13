'use client';

import Link from 'next/link';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/student/problem-solve-card';
import { formatDateTime } from '@/lib/format';
import type { ExerciseDto, SessionDto, TrackDto } from '@/lib/api';

/** Program phases in curriculum order (SPEC §7.6). */
const PHASE_ORDER = ['PYTHON', 'PHASE_I', 'CAMP_I', 'PHASE_II', 'CAMP_II'] as const;

const PHASE_LABELS: Record<string, string> = {
  PYTHON: 'Python Track',
  PHASE_I: 'Education Phase I',
  CAMP_I: 'Camp I',
  PHASE_II: 'Education Phase II',
  CAMP_II: 'Camp II',
};

/** Student Roadmap — vertical phase timeline with completion + upcoming sessions. */
export function RoadmapBoard({
  tracks,
  exercises,
  sessions,
  solved,
  mySuperGroupId,
}: {
  tracks: TrackDto[];
  exercises: ExerciseDto[];
  sessions: SessionDto[];
  solved: Set<string>;
  mySuperGroupId: string | null;
}) {
  const byTrack = new Map<string, ExerciseDto[]>();
  for (const ex of exercises) {
    const list = byTrack.get(ex.trackId) ?? [];
    list.push(ex);
    byTrack.set(ex.trackId, list);
  }

  const ordered = [...tracks].sort(
    (a, b) => PHASE_ORDER.indexOf(a.phase as (typeof PHASE_ORDER)[number]) - PHASE_ORDER.indexOf(b.phase as (typeof PHASE_ORDER)[number]),
  );
  const upcoming = sessions
    .filter((s) => new Date(s.date).getTime() >= Date.now() - 86400_000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  // The "current" phase = first not-fully-completed track.
  const currentId =
    ordered.find((t) => {
      const items = byTrack.get(t.id) ?? [];
      const done = items.filter((ex) => solved.has(ex.problemId)).length;
      return items.length === 0 || done < items.length;
    })?.id ?? null;

  const allDone = ordered.every((t) => {
    const items = byTrack.get(t.id) ?? [];
    return items.length > 0 && items.every((ex) => solved.has(ex.problemId));
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Roadmap</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your journey through the program — five phases, one milestone at a time.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ol className="relative space-y-2 border-l-2 border-slate-100 pl-6">
            {ordered.length === 0 && (
              <li className="card p-6 text-center text-sm text-slate-500">
                No tracks yet — the roadmap appears once the curriculum is set up.
              </li>
            )}
            {ordered.map((track) => {
              const items = byTrack.get(track.id) ?? [];
              const done = items.filter((ex) => solved.has(ex.problemId)).length;
              const isCurrent = track.id === currentId && !allDone;
              const complete = items.length > 0 && done === items.length;
              return (
                <li key={track.id} className="relative pb-4">
                  <span
                    className={`absolute -left-[2.05rem] grid h-8 w-8 place-items-center rounded-full border-2 ${
                      complete
                        ? 'border-a2sv-500 bg-a2sv-500 text-white'
                        : isCurrent
                          ? 'border-a2sv-500 bg-white text-a2sv-600'
                          : 'border-slate-200 bg-white text-slate-300'
                    }`}
                  >
                    <Icon name={complete ? 'check' : isCurrent ? 'clock' : 'map'} className="h-4 w-4" />
                  </span>
                  <div className={`card p-5 ${isCurrent ? 'border-a2sv-300 ring-2 ring-a2sv-100' : ''}`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {complete && <span className="chip bg-a2sv-100 text-a2sv-700">Complete</span>}
                      {isCurrent && <span className="chip bg-a2sv-500 text-white">Up next</span>}
                      <span className="chip bg-slate-100 text-slate-500">{PHASE_LABELS[track.phase] ?? track.phase}</span>
                      {track.superGroupName && <span className="chip bg-slate-100 text-slate-400">{track.superGroupName}</span>}
                    </div>
                    <h3 className="mt-1.5 text-base font-bold text-slate-900">{track.name}</h3>
                    {items.length > 0 ? (
                      <div className="mt-3">
                        <ProgressBar value={done} max={items.length} label="Phase progress" />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">Exercises will be assigned here.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {allDone && ordered.length > 0 && (
            <p className="card bg-a2sv-50/50 p-4 text-center text-sm font-medium text-a2sv-700">
              🎉 You&apos;ve completed every phase — outstanding work!
            </p>
          )}
        </div>

        <aside className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Upcoming sessions</h3>
          {upcoming.length === 0 ? (
            <p className="card p-4 text-center text-sm text-slate-400">No upcoming sessions.</p>
          ) : (
            upcoming.map((session) => (
              <div key={session.id} className="card p-4">
                <p className="truncate text-sm font-semibold text-slate-800">{session.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                  <Icon name="calendar" className="h-3.5 w-3.5" />
                  {formatDateTime(session.date)}
                </p>
                {session.location && <p className="mt-0.5 truncate text-xs text-slate-400">📍 {session.location}</p>}
              </div>
            ))
          )}
          <Link href="/dashboard" className="btn-ghost w-full">
            Back to dashboard
          </Link>
        </aside>
      </div>
    </div>
  );
}