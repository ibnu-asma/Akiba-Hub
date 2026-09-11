'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRACK_PHASE_LABELS, type TrackPhase } from '@hub/shared';
import { OutlinedSelect } from '@/components/form/field';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import type { ProblemDto, TrackDto } from '@/lib/api';

function trackLabel(track: TrackDto): string {
  const phase = TRACK_PHASE_LABELS[track.phase as TrackPhase] ?? track.phase;
  return `${track.superGroupName} · ${phase}`;
}

/** HoE/HoA: attach problems to a track — the "Add exercise" flow (SPEC §Summary D). */
export function AddExerciseForm({ tracks, problems }: { tracks: TrackDto[]; problems: ProblemDto[] }) {
  const router = useRouter();

  const [trackId, setTrackId] = useState('');
  const [problemIds, setProblemIds] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const problemOptions: SelectUserOption[] = problems.map((problem) => ({
    id: problem.id,
    name: problem.name,
    role: problem.platform.charAt(0).toUpperCase() + problem.platform.slice(1),
    group: problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1),
  }));

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!trackId) next.trackId = 'Select the track to fill';
    if (problemIds.length === 0) next.problemIds = 'Select at least one problem';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tracks/${trackId}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemIds }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: { message: string }; added?: number } | null;
      if (!res.ok) {
        setServerError(payload?.error?.message ?? 'Could not add the exercises.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setServerError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  const missing = tracks.length === 0 || problems.length === 0;

  return (
    <form onSubmit={submit} className="card space-y-6 p-6 sm:p-8">
      {missing && (
        <p className="card-tint px-4 py-3 text-sm text-slate-600">
          {tracks.length === 0
            ? 'No tracks yet — create one with "Add Track" first.'
            : 'No problems yet — add some with "Add Problem" first.'}
        </p>
      )}

      <OutlinedSelect
        label="Track"
        required
        options={tracks.map((track) => ({ value: track.id, label: trackLabel(track) }))}
        value={trackId}
        onChange={setTrackId}
        error={errors.trackId}
        placeholder="Which track?"
        hint="Exercises are the problems inside a track"
      />

      <SelectUser
        label="Problems"
        placeholder="Select problems…"
        multiple
        options={problemOptions}
        value={problemIds}
        onChange={setProblemIds}
        error={errors.problemIds ?? null}
        hint={`${problemIds.length} selected — duplicates are skipped automatically`}
      />

      {serverError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="button" className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy || missing}>
          {busy ? 'Adding…' : 'Add exercises'}
        </button>
      </div>
    </form>
  );
}