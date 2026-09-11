'use client';

import { useCallback, useEffect, useState } from 'react';
import { OutlinedSelect } from '@/components/form/field';
import type { Group, SessionDto } from '@/lib/api';

interface RosterRow {
  userId: string;
  name: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
}

type StatusKey = 'present' | 'excused' | 'late' | 'absent';

const STATUS_META: Record<StatusKey, { label: string; title: string; active: string }> = {
  present: { label: '✓', title: 'Present', active: 'border-status-present bg-status-present text-white' },
  excused: { label: 'E', title: 'Excused', active: 'border-status-excused bg-status-excused text-white' },
  late: { label: 'L', title: 'Late', active: 'border-status-late bg-status-late text-white' },
  absent: { label: '✗', title: 'Absent', active: 'border-status-absent bg-status-absent text-white' },
};

const STATUS_ORDER: StatusKey[] = ['present', 'excused', 'late', 'absent'];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** HoE/HoA: attendance roster — pick session + group, mark statuses, save batch (SPEC §7.4). */
export function AttendanceRoster({ sessions, groups }: { sessions: SessionDto[]; groups: Group[] }) {
  const [sessionId, setSessionId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const session = sessions.find((s) => s.id === sessionId) ?? null;
  const ready = Boolean(sessionId && groupId);

  const load = useCallback(async () => {
    if (!sessionId || !groupId) return;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSaved(null);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/attendance?groupId=${encodeURIComponent(groupId)}`);
      const payload = (await res.json().catch(() => null)) as RosterRow[] | { error?: { message: string } } | null;
      if (!res.ok) {
        setLoadError((payload as { error?: { message: string } })?.error?.message ?? 'Could not load the roster.');
        setRows(null);
        return;
      }
      setRows(payload as RosterRow[]);
    } catch {
      setLoadError('Network error while loading the roster.');
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId, groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  function setStatus(userId: string, status: string) {
    setRows((prev) => prev?.map((r) => (r.userId === userId ? { ...r, status } : r)) ?? prev);
  }

  function markEveryonePresent() {
    setRows((prev) => prev?.map((r) => ({ ...r, status: 'present' })) ?? prev);
  }

  const counts = (rows ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  async function save() {
    if (!rows || !ready) return;
    setSaving(true);
    setSaveError(null);
    setSaved(null);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          rows: rows.filter((r) => r.status !== 'pending').map((r) => ({ userId: r.userId, status: r.status })),
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setSaveError(payload?.error?.message ?? 'Could not save attendance.');
        return;
      }
      setSaved(`${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} — saved`);
    } catch {
      setSaveError('Network error while saving.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card grid gap-5 p-6 sm:grid-cols-2">
        <OutlinedSelect
          label="Session"
          value={sessionId}
          onChange={setSessionId}
          placeholder="Select a session…"
          options={sessions.map((s) => ({ value: s.id, label: `${s.name}${s.date ? ` (${s.date})` : ''}` }))}
          hint={session ? `${session.startTime ?? '—'} · ${session.location ?? 'remote'}` : undefined}
        />
        <OutlinedSelect
          label="Group"
          value={groupId}
          onChange={setGroupId}
          placeholder="Select a group…"
          options={groups.map((g) => ({ value: g.id, label: `${g.name}${g.country ? ` (${g.country})` : ''}` }))}
          hint={groups.find((g) => g.id === groupId) ? `${groups.find((g) => g.id === groupId)!.studentCount} students` : undefined}
        />
</div>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">Roster</h2>
          {rows && (
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_ORDER.map((key) => (
                <span key={key} className="chip bg-slate-100 text-slate-600">
                  <span className={`mr-1 inline-block h-2 w-2 rounded-full ${STATUS_META[key].active.split(' ')[1]}`} />
                  {STATUS_META[key].title}: {counts[key] ?? 0}
                </span>
              ))}
            </div>
          )}
        </div>

        {!ready ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">Select a session and a group to load the roster.</p>
        ) : loading ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">Loading roster…</p>
        ) : loadError ? (
          <p className="px-5 py-12 text-center text-sm text-red-600">{loadError}</p>
        ) : !rows || rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">No students in this group yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => {
              const active = row.status in STATUS_META ? (row.status as StatusKey) : null;
              return (
                <li key={row.userId} className="flex items-center gap-3 px-5 py-3">
                  <span className="avatar h-9 w-9 text-[11px]">{initials(row.name)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{row.name}</span>
                  <div className="flex items-center gap-1.5">
                    {STATUS_ORDER.map((key) => (
                      <button
                        key={key}
                        type="button"
                        title={STATUS_META[key].title}
                        onClick={() => setStatus(row.userId, key)}
                        className={`grid h-8 w-8 place-items-center rounded-lg border text-sm font-bold transition ${
                          active === key
                            ? STATUS_META[key].active
                            : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                        }`}
                      >
                        {STATUS_META[key].label}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {rows && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
            <button type="button" className="btn-ghost" onClick={markEveryonePresent}>
              Everyone Present
            </button>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            {saved && <p className="text-sm font-semibold text-a2sv-600">{saved}</p>}
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save attendance'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}