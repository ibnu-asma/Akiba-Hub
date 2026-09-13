'use client';

import { useEffect, useMemo, useState } from 'react';
import { TRACK_PHASE_LABELS, TRACK_PHASES, type TrackPhase } from '@hub/shared';
import { OutlinedInput, OutlinedSelect, type SelectOption } from '@/components/form/field';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import { Modal } from '@/components/modal';
import type { ProblemDto, SuperGroup, TrackDto } from '@/lib/api';

const PHASE_OPTIONS: SelectOption[] = Object.values(TRACK_PHASES).map((phase) => ({
  value: phase,
  label: TRACK_PHASE_LABELS[phase as TrackPhase],
}));

interface TrackProblem {
  id: string;
  name: string;
  difficulty: string;
  sortOrder: number;
}

/** Track detail — edit, manage problems, reassign, delete (SPEC §7.6). */
export function TrackDetailModal({
  track,
  superGroups,
  allProblems,
  otherTracks,
  onClose,
  onChanged,
}: {
  track: TrackDto;
  superGroups: SuperGroup[];
  allProblems: ProblemDto[];
  otherTracks: TrackDto[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [superGroupId, setSuperGroupId] = useState(track.superGroupId);
  const [phase, setPhase] = useState(track.phase);
  const [name, setName] = useState(track.name);

  const [problems, setProblems] = useState<TrackProblem[]>([]);
  const [addSel, setAddSel] = useState<string[]>([]);
  const [reassignSel, setReassignSel] = useState<string[]>([]);
  const [targetTrackId, setTargetTrackId] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const addOptions = useMemo<SelectUserOption[]>(
    () => allProblems.map((p) => ({ id: p.id, name: p.name, role: p.difficulty })),
    [allProblems],
  );
  const reassignOptions = useMemo<SelectUserOption[]>(
    () => problems.map((p) => ({ id: p.id, name: p.name, role: p.difficulty })),
    [problems],
  );
  const targetOptions = useMemo<SelectUserOption[]>(
    () => otherTracks.map((t) => ({ id: t.id, name: t.name, role: t.superGroupName })),
    [otherTracks],
  );

  function loadProblems() {
    fetch(`/api/admin/tracks/${track.id}/problems`)
      .then((r) => r.json())
      .then((d) => setProblems(Array.isArray(d) ? (d as TrackProblem[]) : []))
      .catch(() => setProblems([]));
  }

  useEffect(() => {
    loadProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  async function saveDetails() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/tracks/${track.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ superGroupId, phase, name: name.trim() }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not save.');
        return;
      }
      setSaved(true);
      onChanged();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function addProblems() {
    if (addSel.length === 0) {
      setError('Select at least one problem.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tracks/${track.id}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemIds: addSel }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not add problems.');
        return;
      }
      setAddSel([]);
      loadProblems();
      onChanged();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function removeProblem(problemId: string) {
    await fetch(`/api/admin/tracks/${track.id}/problems/${problemId}`, { method: 'DELETE' }).catch(() => null);
    loadProblems();
    onChanged();
  }

  async function reassign() {
    if (reassignSel.length === 0 || !targetTrackId) {
      setError('Select problems and a destination track.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tracks/${track.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemIds: reassignSel, targetTrackId }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not reassign.');
        return;
      }
      setReassignSel([]);
      setTargetTrackId('');
      loadProblems();
      onChanged();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!window.confirm(`Delete ${track.name}?`)) return;
    await fetch(`/api/admin/tracks/${track.id}`, { method: 'DELETE' }).catch(() => null);
    onChanged();
    onClose();
  }
  return (
    <Modal title={<h2 className="truncate text-base font-bold text-slate-900">{track.name}</h2>} onClose={onClose}>
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Details</h3>
          <OutlinedSelect label="Super group" options={superGroups.map((sg) => ({ value: sg.id, label: sg.name }))} value={superGroupId} onChange={setSuperGroupId} />
          <OutlinedSelect label="Phase" options={PHASE_OPTIONS} value={phase} onChange={setPhase} />
          <OutlinedInput label="Track name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-xs font-semibold text-a2sv-600">Saved ✓</span>}
            <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void saveDetails()}>
              Save details
            </button>
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Problems ({problems.length})</h3>
          <SelectUser label="Add problems" multiple placeholder="Search problems…" options={addOptions} value={addSel} onChange={setAddSel} />
          <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void addProblems()}>
            Add problems
          </button>
          {problems.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {problems.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs capitalize text-slate-400">{p.difficulty}</p>
                  </div>
                  <button type="button" onClick={() => void removeProblem(p.id)} className="text-xs font-semibold text-red-500 hover:underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reassign problems</h3>
          <SelectUser label="Problems to move" multiple placeholder="Select problems…" options={reassignOptions} value={reassignSel} onChange={setReassignSel} />
          <SelectUser label="Destination track" placeholder="Select a track…" options={targetOptions} value={targetTrackId ? [targetTrackId] : []} onChange={(ids) => setTargetTrackId(ids[0] ?? '')} />
          <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void reassign()}>
            Move problems
          </button>
        </section>

        {error && <p className="field-error">{error}</p>}

        <section className="border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => void del()}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Delete track
          </button>
        </section>
      </div>
    </Modal>
  );
}

