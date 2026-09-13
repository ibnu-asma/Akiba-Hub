'use client';

import { useCallback, useEffect, useState } from 'react';
import { TRACK_PHASE_LABELS, type TrackPhase } from '@hub/shared';
import { OutlinedInput, OutlinedSelect } from '@/components/form/field';
import { ExerciseFormModal } from '@/components/head/exercise-form-modal';
import { Modal } from '@/components/modal';
import type { ExerciseDto, ProblemDto, SuperGroup, TrackDto } from '@/lib/api';

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
  problems,
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

  const [addOpen, setAddOpen] = useState(false);
  const [reassigning, setReassigning] = useState<ExerciseDto | null>(null);
  const [reassignTarget, setReassignTarget] = useState('');
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const trackOptions = superGroupId === ALL ? tracks : tracks.filter((t) => t.superGroupId === superGroupId);

  const reload = useCallback(
    async (targetPage = 1, search = q, sg = superGroupId, tk = trackId) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((targetPage - 1) * PAGE_SIZE) });
      if (search.trim()) params.set('q', search.trim());
      if (sg !== ALL) params.set('superGroupId', sg);
      if (tk !== ALL) params.set('trackId', tk);
      const res = await fetch(`/api/admin/tracks/exercises?${params.toString()}`);
      const data = (await res.json().catch(() => null)) as ListResponse | null;
      if (res.ok && data) {
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
          <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
            + Add exercise
          </button>
        </div>
      </div>

      {error && <p className="field-error">{error}</p>}

      {rows.length === 0 ? (
        <section className="card p-10 text-center">
          <p className="text-3xl">💻</p>
          <p className="mt-2 text-sm text-slate-500">No exercises found.</p>
        </section>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Problem</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Track</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((e) => (
                <tr key={e.id} className="transition hover:bg-slate-50">
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate font-medium text-slate-800">{e.problemName}</p>
                    {e.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {e.tags.slice(0, 3).map((t) => (
                          <span key={t} className="chip bg-slate-100 text-slate-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip capitalize ${DIFF_BADGE[e.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>{e.difficulty}</span>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{e.platform}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{e.trackName}</p>
                    <p className="text-xs text-slate-400">
                      {e.superGroupName} · {TRACK_PHASE_LABELS[e.phase as TrackPhase] ?? e.phase}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {e.link && (
                      <a href={e.link} target="_blank" rel="noreferrer" className="mr-3 text-xs font-semibold text-a2sv-600 hover:underline">
                        Open ↗
                      </a>
                    )}
                    <button
                      type="button"
                      className="mr-3 text-xs font-semibold text-slate-500 hover:text-slate-700"
                      onClick={() => setReassigning(e)}
                    >
                      Reassign
                    </button>
                    <button type="button" className="text-xs font-semibold text-red-500 hover:underline" onClick={() => void removeExercise(e)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
{totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => go(page - 1)}>
            ← Prev
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} · {total} total
          </span>
          <button type="button" className="btn-ghost" disabled={page >= totalPages} onClick={() => go(page + 1)}>
            Next →
          </button>
        </div>
      )}

      {addOpen && (
        <ExerciseFormModal
          tracks={tracks}
          problems={problems}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            void reload(1);
          }}
        />
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
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setReassigning(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" disabled={!reassignTarget} onClick={() => void doReassign()}>
                Move
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}