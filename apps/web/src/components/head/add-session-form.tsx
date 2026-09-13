'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox, OutlinedInput, OutlinedSelect } from '@/components/form/field';
import { SelectUser } from '@/components/form/select-user';
import type { Group } from '@/lib/api';

interface SessionResponse {
  error?: { message: string };
}

/** HoE/HoA: add-session form — details, location/meeting link, group assignment (SPEC §7.3). */
export function AddSessionForm({ groups }: { groups: Group[] }) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [resourceLink, setResourceLink] = useState('');
  const [recordingLink, setRecordingLink] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [calendarInvite, setCalendarInvite] = useState(false);
  const [groupIds, setGroupIds] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Session name is required';
    if (!date) next.date = 'Pick a date';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Enter a valid date';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          date,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          location: location.trim() || undefined,
          resourceLink: resourceLink.trim() || undefined,
          recordingLink: recordingLink.trim() || undefined,
          lecturer: lecturer.trim() || undefined,
          calendarInvite,
          groupIds,
        }),
      });
      const payload = (await res.json().catch(() => null)) as SessionResponse | null;
      if (!res.ok) {
        setServerError(payload?.error?.message ?? 'Could not create session.');
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
    <form onSubmit={submit} className="card space-y-6 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <OutlinedInput label="Session name" required placeholder="e.g. Linked-in Review Session" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        </div>
        <OutlinedInput label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <div className="grid grid-cols-2 gap-4">
          <OutlinedInput label="Start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <OutlinedInput label="End" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <OutlinedInput label="Location" placeholder="e.g. Room 3F, Akiba Hub" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <OutlinedInput label="Meeting link" placeholder="https://meet.google.com/…" value={resourceLink} onChange={(e) => setResourceLink(e.target.value)} hint="For remote sessions" />
        <OutlinedInput label="Recording link" placeholder="https://drive.google.com/…" value={recordingLink} onChange={(e) => setRecordingLink(e.target.value)} />
        <OutlinedInput label="Lecturer" placeholder="Who is hosting?" value={lecturer} onChange={(e) => setLecturer(e.target.value)} />
        <div className="flex items-end pb-2">
          <Checkbox label="Send calendar invite" checked={calendarInvite} onChange={setCalendarInvite} />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Assign to groups</p>
        <SelectUser
          label=""
          placeholder="Select groups…"
          multiple
          options={groups.map((g) => ({ id: g.id, name: g.name, role: 'Group', group: null }))}
          value={groupIds}
          onChange={setGroupIds}
        />
        <p className="mt-1 text-xs text-slate-400">Students in these groups will see the session on their Events panel.</p>
      </div>

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
          {busy ? 'Creating…' : 'Create session'}
        </button>
      </div>
    </form>
  );
}