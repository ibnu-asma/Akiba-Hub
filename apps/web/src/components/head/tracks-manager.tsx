'use client';

import { useState } from 'react';
import { TRACK_PHASE_LABELS, type TrackPhase } from '@hub/shared';
import { OutlinedSelect } from '@/components/form/field';
import { TrackFormModal } from '@/components/head/track-form-modal';
import { TrackDetailModal } from '@/components/head/track-detail-modal';
import type { ProblemDto, SuperGroup, TrackDto } from '@/lib/api';

const ALL = '__all__';

/** HoE/HoA: track management — filter, cards, create/edit/delete + problems (SPEC §7.6). */
export function TracksManager({
  initialTracks,
  superGroups,
  problems,
}: {
  initialTracks: TrackDto[];
  superGroups: SuperGroup[];
  problems: ProblemDto[];
}) {
  const [tracks, setTracks] = useState<TrackDto[]>(initialTracks);
  const [filterSg, setFilterSg] = useState(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTrack, setDetailTrack] = useState<TrackDto | null>(null);

  const filtered = filterSg === ALL ? tracks : tracks.filter((t) => t.superGroupId === filterSg);
  const otherTracks = detailTrack ? tracks.filter((t) => t.id !== detailTrack!.id) : [];

  async function reload() {
    const res = await fetch('/api/admin/tracks');
    const rows = (await res.json().catch(() => null)) as TrackDto[] | null;
    if (res.ok && rows) setTracks(rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-64">
          <OutlinedSelect
            label="Super group"
            value={filterSg}
            onChange={setFilterSg}
            placeholder="Select…"
            options={[{ value: ALL, label: 'All super groups' }, ...superGroups.map((sg) => ({ value: sg.id, label: sg.name }))]}
          />
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          + New track
        </button>
      </div>

      {filtered.length === 0 ? (
        <section className="card p-10 text-center">
          <p className="text-3xl">🗺️</p>
          <p className="mt-2 text-sm text-slate-500">No tracks{filterSg !== ALL ? ' in this super group' : ''} yet.</p>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setDetailTrack(t)}
                className="card group flex h-full w-full flex-col p-5 text-left transition hover:border-a2sv-400 hover:ring-2 hover:ring-a2sv-100"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="chip bg-a2sv-500 text-white">{TRACK_PHASE_LABELS[t.phase as TrackPhase] ?? t.phase}</span>
                  {t.superGroupName && <span className="chip bg-slate-100 text-slate-500">{t.superGroupName}</span>}
                </div>
                <h3 className="mt-2 truncate text-base font-bold text-slate-900">{t.name}</h3>
                <p className="text-xs text-slate-400">{t.problemCount} problem{t.problemCount === 1 ? '' : 's'}</p>
                <span className="mt-auto pt-3 text-right text-xs font-semibold text-a2sv-600 opacity-0 transition group-hover:opacity-100">
                  View details →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {createOpen && (
        <TrackFormModal
          superGroups={superGroups}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            void reload();
          }}
        />
      )}

      {detailTrack && (
        <TrackDetailModal
          track={detailTrack}
          superGroups={superGroups}
          allProblems={problems}
          otherTracks={otherTracks}
          onClose={() => setDetailTrack(null)}
          onChanged={() => void reload()}
        />
      )}
    </div>
  );
}
