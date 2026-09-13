'use client';

import { useState } from 'react';
import { TRACK_PHASE_LABELS, type TrackPhase } from '@hub/shared';
import { OutlinedSelect } from '@/components/form/field';
import { ProgressBar } from '@/components/student/problem-solve-card';
import type { ExerciseDto, TrackDto } from '@/lib/api';

const ALL = '__all__';

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
  const [filter, setFilter] = useState(ALL);

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

  const hasOtherSG = mySuperGroupId != null && superGroups.some((sg) => sg.id !== mySuperGroupId);
  const shown = tracks.filter((t) => {
    if (filter === ALL) return true;
    if (filter === '__mine__') return mySuperGroupId != null && t.superGroupId === mySuperGroupId;
    return t.superGroupId === filter;
  });

  function solvedCount(trackId: string): number {
    const items = byTrack.get(trackId) ?? [];
    return items.filter((ex) => solved.has(ex.problemId)).length;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tracks</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your year-long curriculum — five phases, one track at a time. Solve the exercises to complete each phase.
        </p>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-64">
          <OutlinedSelect
            label="Super group"
            value={filter}
            onChange={setFilter}
            options={[
              { value: ALL, label: 'All programs' },
              ...(mySuperGroupId && hasOtherSG ? [{ value: '__mine__', label: 'My program' }] : []),
              ...superGroups.map((sg) => ({ value: sg.id, label: sg.name })),
            ]}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <section className="card p-10 text-center">
          <p className="text-3xl">🗺️</p>
          <p className="mt-2 text-sm text-slate-500">No tracks yet — your head of education will set up the curriculum.</p>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((track) => {
            const total = (byTrack.get(track.id) ?? []).length;
            const done = solvedCount(track.id);
            const isMine = mySuperGroupId != null && track.superGroupId === mySuperGroupId;
            return (
              <li key={track.id}>
                <article className={`card flex h-full flex-col p-5 ${isMine ? 'border-a2sv-300' : ''}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="chip bg-a2sv-500 text-white">{TRACK_PHASE_LABELS[track.phase as TrackPhase] ?? track.phase}</span>
                    {track.superGroupName && <span className="chip bg-slate-100 text-slate-500">{track.superGroupName}</span>}
                    {isMine && <span className="chip bg-a2sv-100 text-a2sv-700">My program</span>}
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900">{track.name}</h3>
                  <p className="text-xs text-slate-400">{total} exercise{total === 1 ? '' : 's'}</p>
                  {total > 0 ? (
                    <div className="mt-3">
                      <ProgressBar value={done} max={total} label="Completed" />
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">Exercises will appear here when assigned.</p>
                  )}
                  <p className="mt-auto pt-2 text-xs text-slate-400">
                    {done === total && total > 0 ? 'Phase complete — great work 🎉' : `${total - done} remaining`}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}