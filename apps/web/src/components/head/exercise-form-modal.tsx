'use client';

import { useState } from 'react';
import { TRACK_PHASE_LABELS, type TrackPhase } from '@hub/shared';
import { OutlinedSelect } from '@/components/form/field';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import { Modal } from '@/components/modal';
import type { ProblemDto, TrackDto } from '@/lib/api';

function trackLabel(track: TrackDto): string {
  const phase = TRACK_PHASE_LABELS[track.phase as TrackPhase] ?? track.phase;
  return `${track.superGroupName} · ${phase}`;
}

/** Add exercises (problems) to a track — SPEC §7.8. */
export function ExerciseFormModal({
  tracks,
  problems,
  onClose,
  onSaved,
}: {
  tracks: TrackDto[];
  problems: ProblemDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [trackId, setTrackId] = useState('');
  const [problemIds, setProblemIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const problemOptions: SelectUserOption[] = problems.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    group: p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1),
  }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!trackId) {
      setError('Select the track to fill.');
      return;
    }
    if (problemIds.length === 0) {
      setError('Select at least one problem.');
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
        setError(parsed?.error?.message ?? 'Could not add the exercises.');
        return;
      }
      onSaved();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  const missing = tracks.length === 0 || problems.length === 0;

  return (
    <Modal title={<h2 className="text-base font-bold text-slate-900">Add exercises</h2>} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {missing && (
          <p className="card-tint px-4 py-3 text-sm text-slate-600">
            {tracks.length === 0 ? 'Create a track with "Add Track" first.' : 'Add some problems with "Add Problem" first.'}
          </p>
        )}
        <OutlinedSelect
          label="Track"
          required
          options={tracks.map((t) => ({ value: t.id, label: trackLabel(t) }))}
          value={trackId}
          onChange={setTrackId}
          placeholder="Which track?"
          hint="Exercises are the problems inside a track"
        />
        <SelectUser
          label="Problems"
          multiple
          placeholder="Select problems…"
          options={problemOptions}
          value={problemIds}
          onChange={setProblemIds}
          hint={`${problemIds.length} selected — duplicates are skipped automatically`}
        />
        {error && <p className="field-error">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || missing}>
            {busy ? 'Adding…' : 'Add exercises'}
          </button>
        </div>
      </form>
    </Modal>
  );
}