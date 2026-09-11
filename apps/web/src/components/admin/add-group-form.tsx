'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedInput, OutlinedSelect } from '@/components/form/field';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import type { SuperGroup } from '@/lib/api';

interface GroupResponse {
  group?: { id: string; name: string };
  error?: { message: string };
}

/** HoA: add-group form — outlined fields + supergroup picker + multi-head picker. */
export function AddGroupForm({
  superGroups,
  heads,
}: {
  superGroups: SuperGroup[];
  heads: SelectUserOption[];
}) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('');
  const [superGroupId, setSuperGroupId] = useState('');
  const [headUserIds, setHeadUserIds] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Group name is required';
    if (!shortName.trim()) next.shortName = 'Short name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          shortName: shortName.trim().toUpperCase(),
          description: description.trim() || undefined,
          country: country.trim() || undefined,
          superGroupId: superGroupId || undefined,
          headUserIds,
        }),
      });
      const payload = (await res.json().catch(() => null)) as GroupResponse | null;
      if (!res.ok) {
        setServerError(payload?.error?.message ?? 'Could not create group.');
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
    <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <OutlinedInput label="Group name" required placeholder="e.g. A2SV Remote G5A" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <OutlinedInput label="Short name" required placeholder="e.g. G5A" value={shortName} onChange={(e) => setShortName(e.target.value)} error={errors.shortName} />
        <OutlinedInput label="Country" placeholder="e.g. Ethiopia" value={country} onChange={(e) => setCountry(e.target.value)} />
        <OutlinedSelect
          label="Super Group"
          value={superGroupId}
          onChange={setSuperGroupId}
          placeholder="None — standalone"
          options={superGroups.map((sg) => ({ value: sg.id, label: sg.name }))}
        />
      </div>

      <div>
        <label className="field-label" htmlFor="description">Description</label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this group focused on?"
          className="field-input resize-none"
        />
      </div>

      <SelectUser
        label="Heads of education"
        placeholder="Select heads…"
        multiple
        options={heads}
        value={headUserIds}
        onChange={setHeadUserIds}
        hint="People who will manage this group's sessions, attendance and content."
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
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create group'}
        </button>
      </div>
    </form>
  );
}