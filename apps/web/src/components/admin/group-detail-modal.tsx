'use client';

import { useState } from 'react';
import { OutlinedInput, OutlinedSelect } from '@/components/form/field';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import { AvatarStack } from '@/components/avatar-stack';
import { Modal } from '@/components/modal';
import type { Group, SuperGroup } from '@/lib/api';

/** Group detail modal — edit details, manage students + heads, delete (SPEC §8.6, §11). */
export function GroupDetailModal({
  group,
  superGroups,
  headOptions,
  studentOptions,
  onClose,
  onChanged,
}: {
  group: Group;
  superGroups: SuperGroup[];
  headOptions: SelectUserOption[];
  studentOptions: SelectUserOption[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [shortName, setShortName] = useState(group.shortName);
  const [country, setCountry] = useState(group.country ?? '');
  const [superGroupId, setSuperGroupId] = useState(group.superGroupId ?? '');
  const [description, setDescription] = useState(group.description ?? '');

  const [headSel, setHeadSel] = useState<string[]>(group.heads.map((h) => h.id));
  const [studentSel, setStudentSel] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          shortName: shortName.trim().toUpperCase(),
          country: country.trim() || null,
          superGroupId: superGroupId || null,
          description: description.trim() || null,
        }),
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

  async function saveHeads() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/groups/${group.id}/heads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headUserIds: headSel }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not save heads.');
        return;
      }
      onChanged();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function addStudents() {
    if (studentSel.length === 0) {
      setError('Select at least one student.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/groups/${group.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: studentSel }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not assign students.');
        return;
      }
      setStudentSel([]);
      onChanged();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function removeStudent(userId: string) {
    await fetch(`/api/admin/groups/${group.id}/students/${userId}`, { method: 'DELETE' }).catch(() => null);
    onChanged();
  }

  async function deleteGroup() {
    if (!window.confirm(`Delete ${group.name}? This is a soft delete.`)) return;
    await fetch(`/api/admin/groups/${group.id}`, { method: 'DELETE' }).catch(() => null);
    onChanged();
    onClose();
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span className="chip bg-a2sv-500 text-white">{group.shortName}</span>
          <h2 className="truncate text-base font-bold text-slate-900">{group.name}</h2>
        </div>
      }
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* Details */}
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Details</h3>
          <form onSubmit={saveDetails} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <OutlinedInput label="Group name" required value={name} onChange={(e) => setName(e.target.value)} />
              <OutlinedInput label="Short name" required value={shortName} onChange={(e) => setShortName(e.target.value)} />
              <OutlinedInput label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Ethiopia" />
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
              placeholder="Description"
              className="field-input resize-none"
            />
            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-xs font-semibold text-a2sv-600">Saved ✓</span>}
              <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={busy}>
                Save details
              </button>
            </div>
          </form>
        </section>

        {/* Students */}
        <section className="border-t border-slate-100 pt-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Students ({group.students.length})
          </h3>
          <div className="mb-3">
            <AvatarStack people={group.students} max={8} />
          </div>
          <div className="space-y-3">
            <SelectUser label="Add students" multiple placeholder="Search students…" options={studentOptions} value={studentSel} onChange={setStudentSel} hint="Unassigned students are listed first." />
            <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void addStudents()}>
              Add students
            </button>
            {group.students.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {group.students.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{s.name}</span>
                    <button type="button" onClick={() => void removeStudent(s.id)} className="text-xs font-semibold text-red-500 hover:underline">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Heads */}
        <section className="border-t border-slate-100 pt-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Heads</h3>
          <div className="space-y-3">
            <SelectUser label="Heads" multiple placeholder="Select heads…" options={headOptions} value={headSel} onChange={setHeadSel} />
            <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void saveHeads()}>
              Save heads
            </button>
          </div>
        </section>

        {error && <p className="field-error">{error}</p>}

        {/* Danger */}
        <section className="border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => void deleteGroup()}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Delete group
          </button>
        </section>
      </div>
    </Modal>
  );
}

