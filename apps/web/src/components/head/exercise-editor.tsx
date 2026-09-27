'use client';

import { useState } from 'react';
import { TRACK_PHASE_LABELS, type TrackPhase } from '@hub/shared';
import { SelectProblems, type SelectProblemOption } from '@/components/form/select-problems';
import type { ProblemDto, TrackDto } from '@/lib/api';

function trackLabel(track: TrackDto): string {
  const phase = TRACK_PHASE_LABELS[track.phase as TrackPhase] ?? track.phase;
  return `${track.superGroupName} · ${phase} — ${track.name}`;
}

/** Full-page editor to assign problems to a curriculum track (SPEC §7.8). */
export function ExerciseEditor({
  tracks,
  problems,
  initialTrackId = '',
}: {
  tracks: TrackDto[];
  problems: ProblemDto[];
  initialTrackId?: string;
}) {

  const [trackId, setTrackId] = useState(initialTrackId);
  const [problemIds, setProblemIds] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const problemOptions: SelectProblemOption[] = problems.map((p) => ({
    id: p.id,
    name: p.name,
    platform: p.platform,
    difficulty: p.difficulty,
    tags: p.tags,
  }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!trackId) {
      setServerError('Select the track to fill.');
      return;
    }
    if (problemIds.length === 0) {
      setServerError('Select at least one problem.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tracks/${trackId}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemIds }),
      });
      if (!res.ok) {
        const parsed = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setServerError(parsed?.error?.message ?? 'Could not add the exercises.');
        return;
      }
      window.location.href = initialTrackId ? `/tracks/${initialTrackId}` : '/exercises';
    } catch {
      setServerError('Network error — could not save exercises.');
    } finally {
      setBusy(false);
    }
  }

  const missing = tracks.length === 0 || problems.length === 0;

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col relative">
      <div className="p-8 space-y-8">
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Assign Exercises</h2>
          
          {missing && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-sm font-semibold text-amber-800">
                {tracks.length === 0 ? 'Create a track with "Add Track" first.' : 'Add some problems with "Add Problem" first.'}
              </p>
            </div>
          )}

          <div className="grid gap-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="trackId" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Target Curriculum Track
              </label>
              <select
                id="trackId"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs"
              >
                <option value="">Select a track...</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {trackLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Problems</label>
              <SelectProblems
                placeholder="Search problems..."
                options={problemOptions}
                value={problemIds}
                onChange={setProblemIds}
              />
              <p className="mt-1 text-[11px] text-slate-400">Search by name, platform, or difficulty. You can assign multiple problems at once.</p>
            </div>
          </div>
        </section>

        {serverError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm text-center">
            <p className="text-sm font-bold text-red-600">{serverError}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-8 py-5 flex items-center justify-end gap-3 border-t border-slate-100 rounded-b-2xl">
        <a
          href={initialTrackId ? `/tracks/${initialTrackId}` : "/exercises"}
          className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={busy || missing}
          className="btn-primary py-2 px-6 shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {busy ? (
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Assign Problems'
          )}
        </button>
      </div>
    </form>
  );
}
