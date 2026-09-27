'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRACK_PHASE_LABELS, TRACK_PHASES, type TrackPhase } from '@hub/shared';
import type { SuperGroup, TrackDto } from '@/lib/api';

/** Full-page editor to create or edit a curriculum track (SPEC §7.6). */
export function TrackEditor({
  superGroups,
  initialTrack,
}: {
  superGroups: SuperGroup[];
  initialTrack?: TrackDto;
}) {
  const router = useRouter();
  const isEditing = Boolean(initialTrack);

  const [superGroupId, setSuperGroupId] = useState(initialTrack?.superGroupId ?? '');
  const [phase, setPhase] = useState(initialTrack?.phase ?? '');
  const [name, setName] = useState(initialTrack?.name ?? '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onPhaseChange(value: string) {
    setPhase(value);
    if (!name.trim() && value) setName(TRACK_PHASE_LABELS[value as TrackPhase] ?? '');
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!superGroupId) next.superGroupId = 'Select a super group.';
    if (!phase) next.phase = 'Select a curriculum phase.';
    if (!name.trim()) next.name = 'Track name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const url = isEditing ? `/api/admin/tracks/${initialTrack!.id}` : '/api/admin/tracks';
      const method = isEditing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ superGroupId, phase, name: name.trim() }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setServerError(payload?.error?.message ?? (isEditing ? 'Could not update track.' : 'Could not create track.'));
        return;
      }
      
      const payload = await res.json();
      // Redirect to the newly created/edited track details page
      window.location.href = `/tracks/${payload.id}`;
    } catch {
      setServerError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!isEditing || !window.confirm('Are you sure you want to delete this track? This cannot be undone.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tracks/${initialTrack!.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setServerError('Could not delete the track. Ensure it has no dependencies.');
        setBusy(false);
        return;
      }
      window.location.href = '/dashboard';
    } catch {
      setServerError('Network error.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col relative max-w-3xl mx-auto">
      <div className="p-8 space-y-8">
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {isEditing ? 'Edit Track' : 'Track Details'}
            </h2>
            {isEditing && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="text-xs font-bold text-red-500 hover:text-red-700 transition"
              >
                Delete Track
              </button>
            )}
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="superGroupId" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Super Group
              </label>
              <select
                id="superGroupId"
                value={superGroupId}
                onChange={(e) => setSuperGroupId(e.target.value)}
                className={`w-full rounded-xl border bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs ${errors.superGroupId ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300'}`}
              >
                <option value="">Select a cohort...</option>
                {superGroups.map((sg) => (
                  <option key={sg.id} value={sg.id}>
                    {sg.name}
                  </option>
                ))}
              </select>
              {errors.superGroupId && <p className="text-xs font-medium text-red-500 px-1">{errors.superGroupId}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phase" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Phase
              </label>
              <select
                id="phase"
                value={phase}
                onChange={(e) => onPhaseChange(e.target.value)}
                className={`w-full rounded-xl border bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs ${errors.phase ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300'}`}
              >
                <option value="">Select phase...</option>
                {Object.values(TRACK_PHASES).map((p) => (
                  <option key={p} value={p}>
                    {TRACK_PHASE_LABELS[p as TrackPhase]}
                  </option>
                ))}
              </select>
              {errors.phase && <p className="text-xs font-medium text-red-500 px-1">{errors.phase}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Track Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Data Structures"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-xl border bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs ${errors.name ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300'}`}
              />
              {errors.name && <p className="text-xs font-medium text-red-500 px-1">{errors.name}</p>}
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
        <button
          type="button"
          className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          onClick={() => router.back()}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="btn-primary py-2 px-6 shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {busy ? (
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            isEditing ? 'Save Changes' : 'Create Track'
          )}
        </button>
      </div>
    </form>
  );
}
