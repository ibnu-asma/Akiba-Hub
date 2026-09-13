'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TRACK_PHASE_LABELS, type TrackPhase } from '@hub/shared';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/student/problem-solve-card';
import type { ExerciseDto, TrackDto } from '@/lib/api';

const ALL = '__all__';

const PHASE_COLORS: Record<string, string> = {
  PYTHON: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PHASE_I: 'bg-sky-50 text-sky-700 border-sky-200',
  PHASE_II: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CAMP_I: 'bg-violet-50 text-violet-700 border-violet-200',
  CAMP_II: 'bg-amber-50 text-amber-700 border-amber-200',
};

/** Student Tracks board — curriculum cards with per-track solved progress (SPEC §6.9). */
export function TracksBoard({
  tracks,
  exercises,
  solved,
  mySuperGroupId,
}: {
  tracks: TrackDto[];
  exercises: ExerciseDto[];
  solved: Set<string>;
  mySuperGroupId: string | null;
}) {
  // If student has a supergroup, default filter to their program; otherwise show empty state or all
  const [filter, setFilter] = useState<string>(mySuperGroupId ? '__mine__' : '__mine__');
  const [showAllPrograms, setShowAllPrograms] = useState<boolean>(false);

  // exercises per track
  const byTrack = new Map<string, ExerciseDto[]>();
  for (const ex of exercises) {
    const list = byTrack.get(ex.trackId) ?? [];
    list.push(ex);
    byTrack.set(ex.trackId, list);
  }

  const superGroups = [...new Set(tracks.map((t) => t.superGroupId))].map((id) => {
    const t = tracks.find((x) => x.superGroupId === id);
    return { id, name: t?.superGroupName ?? 'Unknown' };
  });

  const activeFilter = showAllPrograms ? ALL : filter;

  const shown = tracks.filter((t) => {
    if (activeFilter === ALL) return true;
    if (activeFilter === '__mine__') return mySuperGroupId != null && t.superGroupId === mySuperGroupId;
    return t.superGroupId === activeFilter;
  });

  function solvedCount(trackId: string): number {
    const items = byTrack.get(trackId) ?? [];
    return items.filter((ex) => solved.has(ex.problemId)).length;
  }

  // If student has no assigned program or no tracks for their program, and not showing all programs
  const isUnassigned = mySuperGroupId == null;
  const isMineEmpty = mySuperGroupId != null && shown.length === 0 && activeFilter === '__mine__';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tracks</h1>
        </div>

        {/* Filter controls if tracks exist */}
        {tracks.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {mySuperGroupId && (
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setShowAllPrograms(false);
                    setFilter('__mine__');
                  }}
                  className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                    !showAllPrograms && filter === '__mine__'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Program
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAllPrograms(true);
                    setFilter(ALL);
                  }}
                  className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                    showAllPrograms || filter === ALL
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Programs
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Program Empty State: When student is not assigned to a program yet */}
      {isUnassigned && !showAllPrograms ? (
        <section className="card p-10 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/70">
            <Icon name="map" className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">No tracks for your program yet</h2>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            You are not enrolled in a study group or curriculum track yet. Your head of education will assign you to a group.
          </p>
          
        </section>
      ) : isMineEmpty ? (
        <section className="card p-10 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/70">
            <Icon name="map" className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">No tracks for your program yet</h2>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Your head of education has not scheduled curriculum tracks for your program yet.
          </p>
          {tracks.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowAllPrograms(true)}
                className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-4 cursor-pointer"
              >
                <span>Browse Other Academy Tracks</span>
                <Icon name="chevronRight" className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </section>
      ) : shown.length === 0 ? (
        <section className="card p-10 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-4xl">🗺️</p>
          <h2 className="mt-2 text-base font-bold text-slate-800">No tracks yet</h2>
          <p className="mt-1 text-sm text-slate-500">Your head of education will set up the curriculum tracks.</p>
        </section>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((track) => {
            const total = (byTrack.get(track.id) ?? []).length;
            const done = solvedCount(track.id);
            const isMine = mySuperGroupId != null && track.superGroupId === mySuperGroupId;
            const phaseLabel = TRACK_PHASE_LABELS[track.phase as TrackPhase] ?? track.phase;
            const phaseBadgeColor = PHASE_COLORS[track.phase] ?? 'bg-slate-100 text-slate-700 border-slate-200';

            return (
              <li key={track.id}>
                <Link
                  href={`/tracks/${track.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-a2sv-400 hover:shadow-md cursor-pointer"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${phaseBadgeColor}`}>
                      {phaseLabel}
                    </span>
                    {track.superGroupName && (
                      <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {track.superGroupName}
                      </span>
                    )}
                    {isMine && (
                      <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        My program
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-a2sv-600 transition-colors">
                    {track.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {total} exercise{total === 1 ? '' : 's'} assigned
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {total > 0 ? (
                      <ProgressBar value={done} max={total} label="Completed" />
                    ) : (
                      <p className="text-xs text-slate-400 italic">No exercises assigned yet.</p>
                    )}
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between text-xs text-slate-500 group-hover:text-a2sv-600 font-semibold transition-colors">
                    <span>
                      {done === total && total > 0
                        ? 'Phase complete 🎉'
                        : `${total - done} exercise${total - done === 1 ? '' : 's'} to go`}
                    </span>
                    <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      <span>Open track</span>
                      <Icon name="chevronRight" className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}