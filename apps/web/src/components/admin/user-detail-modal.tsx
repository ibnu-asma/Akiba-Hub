'use client';

import { useState } from 'react';
import { ROLES, ROLE_NAMES, type Role } from '@hub/shared';
import { OutlinedSelect } from '@/components/form/field';
import { Modal } from '@/components/modal';
import type { Group, UserSummaryDto } from '@/lib/api';

const ROLE_OPTIONS = Object.values(ROLES).map((role) => ({ value: role, label: ROLE_NAMES[role as Role] }));
const NO_GROUP = '__none__';

/** User detail modal — change role, assign group, delete (SPEC §8.7). */
export function UserDetailModal({
  user,
  groups,
  onClose,
  onChanged,
}: {
  user: UserSummaryDto;
  groups: Group[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [groupId, setGroupId] = useState(user.groupId ?? NO_GROUP);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const groupOptions = [{ value: NO_GROUP, label: 'No group' }, ...groups.map((g) => ({ value: g.id, label: g.name }))];

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, groupId: groupId === NO_GROUP ? null : groupId }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not update the role.');
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

  async function deleteUser() {
    if (!window.confirm(`Delete ${user.name}? This is a soft delete — they move to the removed list.`)) return;
    await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' }).catch(() => null);
    onChanged();
    onClose();
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-bold text-slate-900">{user.name}</h2>
          <span className="chip bg-slate-100 text-slate-500">{ROLE_NAMES[user.role as Role] ?? user.role}</span>
        </div>
      }
      onClose={onClose}
    >
      <div className="space-y-6">
        <p className="text-sm text-slate-500">{user.email}</p>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role &amp; group</h3>
          <OutlinedSelect label="Role" options={ROLE_OPTIONS} value={role} onChange={setRole} />
          <OutlinedSelect label="Group" options={groupOptions} value={groupId} onChange={setGroupId} />
          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-xs font-semibold text-a2sv-600">Saved ✓</span>}
            <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </section>

        {error && <p className="field-error">{error}</p>}

        <section className="border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => void deleteUser()}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Delete user
          </button>
        </section>
      </div>
    </Modal>
  );
}
