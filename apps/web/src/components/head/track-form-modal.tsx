'use client';

import { useState } from 'react';
import { TRACK_PHASE_LABELS, TRACK_PHASES, type TrackPhase } from '@hub/shared';
import { OutlinedInput, OutlinedSelect, type SelectOption } from '@/components/form/field';
import { Modal } from '@/components/modal';
import type { SuperGroup } from '@/lib/api';

const PHASE_OPTIONS: SelectOption[] = Object.values(TRACK_PHASES).map((phase) => ({
  value: phase,
  label: TRACK_PHASE_LABELS[phase as TrackPhase],
}));

/** Create a track — per-SuperGroup curriculum phase (SPEC §7.6). */
export function TrackFormModal({
  superGroups,
  onClose,
  onSaved,
}: {
  superGroups: SuperGroup[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [superGroupId, setSuperGroupId] = useState('');
  const [phase, setPhase] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPhaseChange(value: string) {
    setPhase(value);
    if (!name.trim() && value) setName(TRACK_PHASE_LABELS[value as TrackPhase] ?? '');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!superGroupId || !phase || !name.trim()) {
      setError('Super group, phase and name are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ superGroupId, phase, name: name.trim() }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not create the track.');
        return;
      }
      onSaved();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={<h2 className="text-base font-bold text-slate-900">New track</h2>} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <OutlinedSelect
          label="Super group"
          required
          options={superGroups.map((sg) => ({ value: sg.id, label: sg.name }))}
          value={superGroupId}
          onChange={setSuperGroupId}
          placeholder="Which program?"
          hint="One track per phase per super group"
        />
        <OutlinedSelect label="Phase" required options={PHASE_OPTIONS} value={phase} onChange={onPhaseChange} placeholder="Python Track…" />
        <OutlinedInput label="Track name" required placeholder="e.g. Python Track" value={name} onChange={(e) => setName(e.target.value)} />
        {error && <p className="field-error">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || superGroups.length === 0}>
            {busy ? 'Creating…' : 'Create track'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
