'use client';

import { useState } from 'react';
import { OutlinedInput } from '@/components/form/field';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import { Modal } from '@/components/modal';
import type { SuperGroup } from '@/lib/api';

/** Super-group detail modal — rename, manage member groups, delete (SPEC §8.4). */
export function SuperGroupDetailModal({
  superGroup,
  groupOptions,
  onClose,
  onChanged,
}: {
  superGroup: SuperGroup;
  groupOptions: SelectUserOption[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(superGroup.name);
  const [groupIds, setGroupIds] = useState<string[]>(superGroup.groups.map((g) => g.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveName() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/super-groups/${superGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not rename.');
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

  async function saveGroups() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/super-groups/${superGroup.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not save groups.');
        return;
      }
      onChanged();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function deleteSuperGroup() {
    if (!window.confirm(`Delete ${superGroup.name}? Its groups will become unassigned.`)) return;
    await fetch(`/api/admin/super-groups/${superGroup.id}`, { method: 'DELETE' }).catch(() => null);
    onChanged();
    onClose();
  }

  return (
    <Modal title={<h2 className="truncate text-base font-bold text-slate-900">{superGroup.name}</h2>} onClose={onClose}>
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Name</h3>
          <OutlinedInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-xs font-semibold text-a2sv-600">Saved ✓</span>}
            <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void saveName()}>
              Save name
            </button>
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Member groups ({superGroup.groups.length})</h3>
          <SelectUser label="Groups" multiple placeholder="Select groups…" options={groupOptions} value={groupIds} onChange={setGroupIds} />
          <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void saveGroups()}>
            Save groups
          </button>
        </section>

        {error && <p className="field-error">{error}</p>}

        <section className="border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => void deleteSuperGroup()}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Delete super group
          </button>
        </section>
      </div>
    </Modal>
  );
}
