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

interface AttendanceGrid {
  sessions: { id: string; name: string; date: string }[];
  students: { userId: string; name: string; cells: Record<string, string> }[];
}

const GRID_COLOR: Record<string, string> = {
  present: '#16a34a',
  absent: '#dc2626',
  excused: '#d97706',
  late: '#2563eb',
};

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
  const [grid, setGrid] = useState<AttendanceGrid | null>(null);

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

  useEffect(() => {
    if (!groupId) {
      setGrid(null);
      return;
    }
    const month = new Date().toISOString().slice(0, 7);
    fetch(`/api/admin/sessions/attendance-grid?groupId=${encodeURIComponent(groupId)}&month=${month}`)
      .then((r) => r.json())
      .then((d) => setGrid(d && Array.isArray(d.sessions) ? (d as AttendanceGrid) : null))
      .catch(() => setGrid(null));
  }, [groupId]);

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
  const presentPct = rows && rows.length > 0 ? Math.round(((counts['present'] ?? 0) / rows.length) * 100) : 0;

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
              <span className="chip bg-a2sv-50 font-semibold text-a2sv-700">{presentPct}% present</span>
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
                  <span className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{row.name}</p>
                    {(row.status === 'present' || row.status === 'late') && row.checkInAt && (
                      <p className="text-xs text-slate-400">
                        Checked in {new Date(row.checkInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </span>
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

      {grid && grid.sessions.length > 0 && (
        <section className="card overflow-x-auto">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">Monthly overview</h2>
            <span className="chip bg-slate-100 text-slate-500">{new Date().toISOString().slice(0, 7)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Student</th>
                  {grid.sessions.map((s) => (
                    <th key={s.id} className="px-2 py-3 text-center font-semibold" title={s.name}>
                      {s.date.slice(8)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grid.students.map((st) => (
                  <tr key={st.userId}>
                    <td className="px-5 py-2.5 font-medium text-slate-800">{st.name}</td>
                    {grid.sessions.map((s) => {
                      const status = st.cells[s.id];
                      return (
                        <td key={s.id} className="px-2 py-2.5 text-center">
                          <span
                            className="inline-block h-3.5 w-3.5 rounded-full"
                            style={{ backgroundColor: status ? (GRID_COLOR[status] ?? '#e2e8f0') : '#e2e8f0' }}
                            title={status ? status : 'unmarked'}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GRID_COLOR.present }} /> Present
            <span className="ml-3 mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GRID_COLOR.late }} /> Late
            <span className="ml-3 mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GRID_COLOR.excused }} /> Excused
            <span className="ml-3 mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GRID_COLOR.absent }} /> Absent
            <span className="ml-3 mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#e2e8f0' }} /> Unmarked
          </p>
        </section>
      )}
    </div>
  );
}