'use client';

import { useCallback, useEffect, useState } from 'react';
import { TRACK_PHASE_LABELS, type TrackPhase } from '@hub/shared';
import { OutlinedInput, OutlinedSelect } from '@/components/form/field';
import { Modal } from '@/components/modal';
import type { ExerciseDto, ProblemDto, SuperGroup, TrackDto } from '@/lib/api';
import { Icon } from '@/components/icon';

const PAGE_SIZE = 10;
const ALL = '__all__';

const DIFF_BADGE: Record<string, string> = {
  easy: 'bg-a2sv-50 text-a2sv-700',
  medium: 'bg-amber-50 text-amber-700',
  hard: 'bg-red-50 text-red-700',
};

interface ListResponse {
  rows: ExerciseDto[];
  total: number;
}

/** HoE/HoA: exercise management — cross-track list, add/remove/reassign (SPEC §7.8). */
export function ExercisesManager({
  initial,
  initialTotal,
  superGroups,
  tracks,
}: {
  initial: ExerciseDto[];
  initialTotal: number;
  superGroups: SuperGroup[];
  tracks: TrackDto[];
  problems: ProblemDto[];
}) {
  const [rows, setRows] = useState<ExerciseDto[]>(initial);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);

  const [q, setQ] = useState('');
  const [superGroupId, setSuperGroupId] = useState(ALL);
  const [trackId, setTrackId] = useState(ALL);

  const [error, setError] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<ExerciseDto | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('');

  const trackOptions = superGroupId === ALL ? tracks : tracks.filter((t) => t.superGroupId === superGroupId);

  const reload = useCallback(
    async (p: number) => {
      const qs = new URLSearchParams();
      qs.set('offset', String((p - 1) * PAGE_SIZE));
      qs.set('limit', String(PAGE_SIZE));
      if (q) qs.set('q', q);
      if (superGroupId !== ALL) qs.set('superGroupId', superGroupId);
      if (trackId !== ALL) qs.set('trackId', trackId);

      const res = await fetch(`/api/admin/tracks/exercises?${qs.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as ListResponse;
        setRows(data.rows);
        setTotal(data.total);
      }
    },
    [q, superGroupId, trackId],
  );

  useEffect(() => {
    setTrackId(ALL);
    void reload(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [superGroupId]);

  useEffect(() => {
    void reload(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, q]);

  function go(num: number) {
    setPage(num);
    void reload(num);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function removeExercise(row: ExerciseDto) {
    if (!window.confirm(`Remove "${row.problemName}" from ${row.trackName}?`)) return;
    await fetch(`/api/admin/tracks/${row.trackId}/problems/${row.problemId}`, { method: 'DELETE' }).catch(() => null);
    void reload(page);
  }

  async function doReassign() {
    if (!reassigning || !reassignTarget) {
      setError('Pick a destination track.');
      return;
    }
    const res = await fetch(`/api/admin/tracks/${reassigning.trackId}/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemIds: [reassigning.problemId], targetTrackId: reassignTarget }),
    });
    if (!res.ok) {
      const parsed = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
      setError(parsed?.error?.message ?? 'Could not reassign.');
      return;
    }
    setReassigning(null);
    setReassignTarget('');
    setError(null);
    void reload(page);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-52">
          <OutlinedInput label="Search" placeholder="Problem name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="w-full sm:w-52">
          <OutlinedSelect
            label="Super group"
            value={superGroupId}
            onChange={setSuperGroupId}
            options={[{ value: ALL, label: 'All super groups' }, ...superGroups.map((sg) => ({ value: sg.id, label: sg.name }))]}
          />
        </div>
        <div className="w-full sm:w-56">
          <OutlinedSelect
            label="Track"
            value={trackId}
            onChange={setTrackId}
            options={[{ value: ALL, label: 'All tracks' }, ...trackOptions.map((t) => ({ value: t.id, label: t.name }))]}
          />
        </div>
        <div className="ml-auto">
          <a href="/exercises/new" className="btn-primary py-2 px-4 flex items-center gap-2">
            <Icon name="plus" className="h-4 w-4" /> Add exercises
          </a>
        </div>
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Problem</th>
                <th className="px-6 py-4">Platform</th>
                <th className="px-6 py-4">Track</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {rows.map((row) => (
                <tr key={`${row.trackId}-${row.problemId}`} className="hover:bg-slate-50/50 transition group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-2xs ${DIFF_BADGE[row.difficulty] ?? DIFF_BADGE.medium}`}>
                          {row.difficulty}
                        </span>
                        <a href={row.link} target="_blank" rel="noreferrer" className="font-bold text-slate-900 hover:text-a2sv-600 transition">
                          {row.problemName}
                        </a>
                      </div>
                      {row.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {row.tags.slice(0, 3).map((t) => (
                            <span key={t} className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize text-slate-600 font-medium">
                    {row.platform}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-semibold text-slate-500">
                      {row.superGroupName} · <span className="text-slate-800">{TRACK_PHASE_LABELS[row.phase as TrackPhase] ?? row.phase}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400 truncate max-w-[200px]">{row.trackName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition">
                      {row.link && (
                        <a href={row.link} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg text-slate-400 hover:text-a2sv-600 hover:bg-a2sv-50 transition" aria-label="Open Link">
                          <Icon name="externalLink" className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setReassigning(row);
                          setReassignTarget(row.trackId);
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-a2sv-600 transition"
                      >
                        Reassign &rarr;
                      </button>
                      <button
                        onClick={() => void removeExercise(row)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        aria-label="Remove exercise"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Icon name="code" className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                    <h3 className="text-sm font-bold text-slate-900">No exercises found</h3>
                    <p className="mt-1 text-xs">Assign problems to tracks to see them here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button type="button" className="btn-ghost px-3 py-1 text-sm font-semibold text-slate-500 hover:text-slate-700" disabled={page <= 1} onClick={() => go(page - 1)}>
            &larr; Prev
          </button>
          <span className="text-sm font-medium text-slate-500">
            Page {page} of {totalPages} <span className="mx-1">·</span> {total} total
          </span>
          <button type="button" className="btn-ghost px-3 py-1 text-sm font-semibold text-slate-500 hover:text-slate-700" disabled={page >= totalPages} onClick={() => go(page + 1)}>
            Next &rarr;
          </button>
        </div>
      )}

      {reassigning && (
        <Modal title={<h2 className="text-base font-bold text-slate-900">Reassign problem</h2>} onClose={() => setReassigning(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Move <span className="font-semibold text-slate-800">{reassigning.problemName}</span> from{' '}
              <span className="font-semibold text-slate-800">{reassigning.trackName}</span> to…
            </p>
            <OutlinedSelect
              label="Destination track"
              value={reassignTarget}
              onChange={setReassignTarget}
              placeholder="Select a track…"
              options={tracks
                .filter((t) => t.id !== reassigning.trackId)
                .map((t) => ({
                  value: t.id,
                  label: `${t.superGroupName} · ${TRACK_PHASE_LABELS[t.phase as TrackPhase] ?? t.phase} — ${t.name}`,
                }))}
            />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition" onClick={() => setReassigning(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary py-2 px-6 shadow-sm disabled:opacity-50" disabled={!reassignTarget} onClick={() => void doReassign()}>
                Move
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
