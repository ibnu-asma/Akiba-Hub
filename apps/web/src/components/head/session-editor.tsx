'use client';

import { useState } from 'react';
import type { Group } from '@/lib/api';

export interface SessionDto {
  id?: string;
  name: string;
  description?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  resourceLink?: string | null;
  recordingLink?: string | null;
  lecturer?: string | null;
  fundId?: string | null;
  calendarInvite?: boolean | null;
  groupIds?: string[];
}

export function SessionEditor({ groups, session }: { groups: Group[]; session?: SessionDto }) {
  const [name, setName] = useState(session?.name ?? '');
  const [description, setDescription] = useState(session?.description ?? '');
  const [date, setDate] = useState(session?.date ?? '');
  const [startTime, setStartTime] = useState(session?.startTime ?? '');
  const [endTime, setEndTime] = useState(session?.endTime ?? '');
  const [location, setLocation] = useState(session?.location ?? '');
  const [resourceLink, setResourceLink] = useState(session?.resourceLink ?? '');
  const [recordingLink, setRecordingLink] = useState(session?.recordingLink ?? '');
  const [lecturer, setLecturer] = useState(session?.lecturer ?? '');
  const [calendarInvite, setCalendarInvite] = useState(session?.calendarInvite ?? false);
  const [groupIds, setGroupIds] = useState<string[]>(session?.groupIds ?? []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Session name is required';
    if (!date) next.date = 'Pick a date';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Enter a valid date (YYYY-MM-DD)';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function toggleGroup(id: string) {
    setGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setServerError(null);

    try {
      const payload = {
        name,
        description,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        location: location || null,
        resourceLink: resourceLink || null,
        recordingLink: recordingLink || null,
        lecturer: lecturer || null,
        calendarInvite,
        groupIds,
      };
      
      const url = session ? `/api/admin/sessions/${session.id}` : '/api/admin/sessions';
      const method = session ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setServerError(data?.error?.message ?? 'Failed to save session');
        setBusy(false);
        return;
      }

      window.location.href = '/sessions';
    } catch {
      setServerError('Network error. Could not save session.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
      <div className="p-8 space-y-8">
        
        {/* Core Details */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Core Details</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Intro to Dynamic Programming"
                className={`w-full rounded-xl border ${errors.name ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-a2sv-500 focus:ring-a2sv-100'} bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:ring-2 transition shadow-sm`}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full rounded-xl border ${errors.date ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-a2sv-500 focus:ring-a2sv-100'} bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:ring-2 transition shadow-sm`}
              />
              {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lecturer (Optional)</label>
              <input
                type="text"
                value={lecturer}
                onChange={(e) => setLecturer(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100 transition shadow-sm"
              />
            </div>
          </div>
        </section>

        {/* Schedule & Location */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Schedule & Location</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100 transition shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100 transition shadow-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location / Meeting Link</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Zoom Link or Room 3B"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100 transition shadow-sm"
              />
            </div>
          </div>
        </section>

        {/* Cohorts */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Assign Cohorts</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {groups.map((g) => {
              const active = groupIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-a2sv-500 bg-a2sv-50/50 shadow-xs ring-1 ring-a2sv-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition ${
                      active ? 'border-a2sv-500 bg-a2sv-500 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {active && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${active ? 'text-a2sv-900' : 'text-slate-700'}`}>
                    {g.name}
                  </span>
                </button>
              );
            })}
          </div>
          {groups.length === 0 && <p className="text-sm text-slate-500 italic">No groups available to assign.</p>}
        </section>

        {serverError && <p className="text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-lg">{serverError}</p>}
      </div>

      <div className="bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-8 py-5">
        <div>
          {session && (
            confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">Are you sure?</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await fetch(`/api/admin/sessions/${session.id}`, { method: 'DELETE' });
                      window.location.href = '/sessions';
                    } catch {
                      setServerError('Failed to delete session.');
                      setBusy(false);
                      setConfirmDelete(false);
                    }
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-red-600 transition hover:bg-red-700 shadow-xs disabled:opacity-50"
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
              >
                Delete Session
              </button>
            )
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.href = '/sessions'}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-a2sv-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-a2sv-700 active:scale-95 disabled:opacity-50"
          >
            {busy ? 'Saving...' : session ? 'Save Changes' : 'Create Session'}
          </button>
        </div>
      </div>
    </form>
  );
}
