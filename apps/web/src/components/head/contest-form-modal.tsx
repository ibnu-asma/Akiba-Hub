'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox, OutlinedInput, OutlinedSelect, type SelectOption } from '@/components/form/field';
import { SelectUser } from '@/components/form/select-user';
import { Modal } from '@/components/modal';
import { CONTEST_TYPES } from '@hub/shared';
import type { ContestDto, Group } from '@/lib/api';

const TYPE_OPTIONS: SelectOption[] = [
  { value: CONTEST_TYPES.standard, label: 'Standard contest' },
  { value: CONTEST_TYPES.super, label: 'Super contest' },
];

/** Create/edit a contest (SPEC §7.7). */
export function ContestFormModal({
  groups,
  contest,
  onClose,
  onSaved,
}: {
  groups: Group[];
  contest?: ContestDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const editing = Boolean(contest);
  const [name, setName] = useState(contest?.name ?? '');
  const [number, setNumber] = useState(contest?.number != null ? String(contest.number) : '');
  const [type, setType] = useState<string>(contest?.type ?? CONTEST_TYPES.standard);
  const [unrated, setUnrated] = useState(contest?.unrated ?? false);
  const [date, setDate] = useState(contest?.date ? contest.date.slice(0, 10) : '');
  const [standingsLink, setStandingsLink] = useState(contest?.standingsLink ?? '');
  const [groupIds, setGroupIds] = useState<string[]>(contest?.groupIds ?? []);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): string | null {
    if (!name.trim()) return 'Contest name is required';
    if (!date) return 'Pick the contest date';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Enter a valid date';
    if (standingsLink.trim() && !/^https?:\/\//.test(standingsLink.trim())) return 'Enter a valid URL';
    if (groupIds.length === 0) return 'Assign at least one group';
    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        number: number.trim() ? Number.parseInt(number, 10) : null,
        type,
        unrated,
        date,
        standingsLink: standingsLink.trim() || null,
        groupIds,
      };
      const res = await fetch(editing ? `/api/admin/contests/${contest!.id}` : '/api/admin/contests', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const parsed = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(parsed?.error?.message ?? 'Could not save the contest.');
        return;
      }
      router.refresh();
      onSaved();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={<h2 className="text-base font-bold text-slate-900">{editing ? 'Edit contest' : 'New contest'}</h2>} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <OutlinedInput label="Contest name" required placeholder="e.g. Remote G5 Contest #31" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <OutlinedInput label="Contest number" type="number" placeholder="e.g. 31" value={number} onChange={(e) => setNumber(e.target.value)} />
          <OutlinedSelect label="Contest type" options={TYPE_OPTIONS} value={type} onChange={setType} />
          <OutlinedInput label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <OutlinedInput
            label="Standings link"
            placeholder="https://…"
            value={standingsLink}
            onChange={(e) => setStandingsLink(e.target.value)}
            hint="Shown as the Standing badge"
          />
        </div>
        <div className="flex items-center">
          <Checkbox label="Unrated contest" checked={unrated} onChange={setUnrated} />
        </div>
        <SelectUser
          label="Participating groups"
          multiple
          placeholder="Select groups…"
          options={groups.map((g) => ({ id: g.id, name: g.name, role: 'Group', group: null }))}
          value={groupIds}
          onChange={setGroupIds}
        />
        {error && <p className="field-error">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || groups.length === 0}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create contest'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
