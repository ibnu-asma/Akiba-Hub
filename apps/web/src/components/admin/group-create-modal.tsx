'use client';

import { useState } from 'react';
import { OutlinedInput, OutlinedSelect } from '@/components/form/field';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import { Modal } from '@/components/modal';
import type { SuperGroup } from '@/lib/api';

/** Create-group modal (SPEC §8.6). */
export function GroupCreateModal({
  superGroups,
  headOptions,
  onClose,
  onCreated,
}: {
  superGroups: SuperGroup[];
  headOptions: SelectUserOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [country, setCountry] = useState('');
  const [superGroupId, setSuperGroupId] = useState('');
  const [description, setDescription] = useState('');
  const [headUserIds, setHeadUserIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !shortName.trim()) {
      setError('Name and short name are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          shortName: shortName.trim().toUpperCase(),
          country: country.trim() || undefined,
          superGroupId: superGroupId || undefined,
          description: description.trim() || undefined,
          headUserIds,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Could not create group.');
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
    <Modal title={<h2 className="text-base font-bold text-slate-900">New group</h2>} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <OutlinedInput label="Group name" required placeholder="e.g. Akiba Remote G5A" value={name} onChange={(e) => setName(e.target.value)} />
          <OutlinedInput label="Short name" required placeholder="e.g. G5A" value={shortName} onChange={(e) => setShortName(e.target.value)} />
          <OutlinedInput label="Country" placeholder="e.g. Ethiopia" value={country} onChange={(e) => setCountry(e.target.value)} />
          <OutlinedSelect
            label="Super Group"
            value={superGroupId}
            onChange={setSuperGroupId}
            placeholder="None — standalone"
            options={superGroups.map((sg) => ({ value: sg.id, label: sg.name }))}
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What is this group focused on?"
          className="field-input resize-none"
        />
        <SelectUser label="Heads of education" multiple placeholder="Select heads…" options={headOptions} value={headUserIds} onChange={setHeadUserIds} />
        {error && <p className="field-error">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
