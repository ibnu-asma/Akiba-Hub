'use client';

import { useState } from 'react';
import { OutlinedInput } from '@/components/form/field';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import { Modal } from '@/components/modal';

/** Create super-group modal — name + member-group multi-select (SPEC §8.4). */
export function SuperGroupCreateModal({
  groupOptions,
  onClose,
  onCreated,
}: {
  groupOptions: SelectUserOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/super-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), groupIds }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Could not create super group.');
        return;
      }
      onCreated();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={<h2 className="text-base font-bold text-slate-900">New super group</h2>} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <OutlinedInput label="Name" required placeholder="e.g. Remote, InPerson…" value={name} onChange={(e) => setName(e.target.value)} />
        <SelectUser label="Member groups" multiple placeholder="Select groups…" options={groupOptions} value={groupIds} onChange={setGroupIds} hint="Groups organized under this super group." />
        {error && <p className="field-error">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
