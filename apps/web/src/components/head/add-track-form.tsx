'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRACK_PHASE_LABELS, TRACK_PHASES, type TrackPhase } from '@hub/shared';
import { OutlinedInput, OutlinedSelect, type SelectOption } from '@/components/form/field';
import type { SuperGroup } from '@/lib/api';

const PHASE_OPTIONS: SelectOption[] = Object.values(TRACK_PHASES).map((phase) => ({
  value: phase,
  label: TRACK_PHASE_LABELS[phase as TrackPhase],
}));

/** HoE/HoA: create a track — per-SuperGroup curriculum phase (SPEC §6.2 / §7.5). */
export function AddTrackForm({ superGroups }: { superGroups: SuperGroup[] }) {
  const router = useRouter();

  const [superGroupId, setSuperGroupId] = useState('');
  const [phase, setPhase] = useState('');
  const [name, setName] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onPhaseChange(value: string) {
    setPhase(value);
    // Suggest the conventional track name (e.g. "Python Track") until overridden.
    if (!name.trim() && value) setName(TRACK_PHASE_LABELS[value as TrackPhase] ?? '');
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!superGroupId) next.superGroupId = 'Select the super group (program)';
    if (!phase) next.phase = 'Select the education phase';
    if (!name.trim()) next.name = 'Track name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ superGroupId, phase, name: name.trim() }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
      if (!res.ok) {
        setServerError(payload?.error?.message ?? 'Could not create the track.');
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

  return (
    <form onSubmit={submit} className="card space-y-6 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <OutlinedSelect
          label="Super group"
          required
          options={superGroups.map((sg) => ({ value: sg.id, label: sg.name }))}
          value={superGroupId}
          onChange={setSuperGroupId}
          error={errors.superGroupId}
          placeholder="Which program?"
          hint="One track per phase per super group"
        />
        <OutlinedSelect label="Phase" required options={PHASE_OPTIONS} value={phase} onChange={onPhaseChange} error={errors.phase} placeholder="Python Track…" />
        <div className="sm:col-span-2">
          <OutlinedInput label="Track name" required placeholder="e.g. Python Track" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        </div>
      </div>

      {serverError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="button" className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy || superGroups.length === 0}>
          {busy ? 'Creating…' : 'Create track'}
        </button>
      </div>
    </form>
  );
}