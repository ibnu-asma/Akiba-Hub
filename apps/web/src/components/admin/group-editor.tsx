'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import { Modal } from '@/components/modal';
import type { Group, SuperGroup } from '@/lib/api';

/** Full-page editor to create or edit a group (SPEC §8.6). */
export function GroupEditor({
  superGroups,
  headOptions,
  studentOptions,
  initialGroup,
}: {
  superGroups: SuperGroup[];
  headOptions: SelectUserOption[];
  studentOptions: SelectUserOption[];
  initialGroup?: Group;
}) {
  const router = useRouter();
  const isEditing = Boolean(initialGroup);

  const [name, setName] = useState(initialGroup?.name ?? '');
  const [shortName, setShortName] = useState(initialGroup?.shortName ?? '');
  const [country, setCountry] = useState(initialGroup?.country ?? '');
  const [superGroupId, setSuperGroupId] = useState(initialGroup?.superGroupId ?? '');
  const [description, setDescription] = useState(initialGroup?.description ?? '');

  const [headUserIds, setHeadUserIds] = useState<string[]>(initialGroup?.heads.map(h => h.id) ?? []);
  const [studentUserIds, setStudentUserIds] = useState<string[]>(initialGroup?.students.map(s => s.id) ?? []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Group name is required.';
    if (!shortName.trim()) next.shortName = 'Short name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const url = isEditing ? `/api/admin/groups/${initialGroup!.id}` : '/api/admin/groups';
      const method = isEditing ? 'PATCH' : 'POST';
      
      const payload: any = {
        name: name.trim(),
        shortName: shortName.trim().toUpperCase(),
        country: country.trim() || undefined,
        superGroupId: superGroupId || undefined,
        description: description.trim() || undefined,
        headUserIds, // POST /groups uses this, PATCH ignores it
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setServerError(body?.error?.message ?? (isEditing ? 'Could not update group.' : 'Could not create group.'));
        return;
      }
      
      const data = await res.json();
      const groupId = isEditing ? initialGroup!.id : data.id;

      // Handle heads for edit mode (create handles it via POST payload)
      if (isEditing) {
        await fetch(`/api/admin/groups/${groupId}/heads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ headUserIds }),
        });
      }

      // Handle students for both create and edit mode
      if (studentUserIds.length > 0 || isEditing) {
        await fetch(`/api/admin/groups/${groupId}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: studentUserIds }),
        });
      }

      window.location.href = `/groups/${groupId}`;
    } catch {
      setServerError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!isEditing) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/groups/${initialGroup!.id}`, { method: 'DELETE' });
      if (!res.ok) {
        setServerError('Could not delete the group.');
        setBusy(false);
        return;
      }
      window.location.href = '/groups';
    } catch {
      setServerError('Network error.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col relative">
      <div className="p-8 space-y-8">
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {isEditing ? 'Edit Group' : 'Group Details'}
            </h2>
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs"
              >
                <option value="">None — standalone group</option>
                {superGroups.map((sg) => (
                  <option key={sg.id} value={sg.id}>{sg.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Group Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Akiba Remote G5A"
                className={`w-full rounded-xl border bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs ${errors.name ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="shortName" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Short Name *
              </label>
              <input
                id="shortName"
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. G5A"
                className={`w-full rounded-xl border bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs ${errors.shortName ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300'}`}
              />
              {errors.shortName && <p className="text-xs text-red-500 mt-1">{errors.shortName}</p>}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="country" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Country
              </label>
              <input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Ethiopia"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs"
              />
            </div>
            
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes, schedules, or descriptions..."
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs"
              />
            </div>
          </div>
        </section>

        <section className="space-y-6 pt-6 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            People Management
          </h2>
          
          <div className="space-y-4">
            <SelectUser
              label="Heads & Educators"
              options={headOptions}
              value={headUserIds}
              onChange={setHeadUserIds}
              multiple
            />
            
            <SelectUser
              label="Students"
              options={studentOptions}
              value={studentUserIds}
              onChange={setStudentUserIds}
              multiple
            />
            
          </div>
        </section>

        {serverError && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm font-semibold text-red-800">{serverError}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 justify-between border-t border-slate-100">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={busy}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full sm:w-auto px-6 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {busy ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Group')}
          </button>
        </div>

        {isEditing && (
          <section className="mt-8 rounded-xl border border-red-200 bg-red-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-red-800">Danger Zone</h3>
              <p className="mt-1 text-xs text-red-600/80">
                Permanently delete this group. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDeleting(true)}
              className="shrink-0 rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-200 hover:text-red-800"
            >
              Delete Group
            </button>
          </section>
        )}
      </div>

      {isDeleting && (
        <Modal title={<span className="text-red-600">Delete Group</span>} onClose={() => setIsDeleting(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete <strong className="font-semibold">{initialGroup!.name}</strong>?
              This will remove all students and heads from this group.
            </p>
            <div className="flex gap-3 justify-end mt-4">
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                {busy ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </form>
  );
}
