'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Icon } from '@/components/icon';
import type { Group, SessionDto, Me } from '@/lib/api';
import { ROLE_LEVEL, type Role } from '@hub/shared';

interface RosterRow {
  userId: string;
  name: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  avatarUrl?: string | null;
}

interface AttendanceGrid {
  sessions: { id: string; name: string; date: string }[];
  students: { userId: string; name: string; cells: Record<string, string> }[];
}

const GRID_COLOR: Record<string, string> = {
  present: '#10b981', // emerald-500
  absent: '#ef4444',  // red-500
  excused: '#f59e0b', // amber-500
  late: '#3b82f6',    // blue-500
};

type StatusKey = 'present' | 'excused' | 'late' | 'absent';

const STATUS_META: Record<StatusKey, { label: string; active: string }> = {
  present: { label: 'Present', active: 'border-emerald-500 bg-emerald-500 text-white' },
  excused: { label: 'Excused', active: 'border-amber-500 bg-amber-500 text-white' },
  late: { label: 'Late', active: 'border-blue-500 bg-blue-500 text-white' },
  absent: { label: 'Absent', active: 'border-red-500 bg-red-500 text-white' },
};

const STATUS_ORDER: StatusKey[] = ['present', 'excused', 'late', 'absent'];

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

function Avatar({ name, url, size = 'h-9 w-9 text-xs' }: { name: string; url?: string | null; size?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${size} shrink-0 rounded-full object-cover border border-white shadow-xs`} />;
  }
  return (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800 border border-white shadow-xs`}>
      {initials(name)}
    </span>
  );
}

export function AttendanceRoster({ sessions, groups, me }: { sessions: SessionDto[]; groups: Group[]; me: Me }) {
  const isHoA = (ROLE_LEVEL[me.role as Role] ?? 1) >= 3;
  
  // Filter groups: HoA sees all, HoE only sees their assigned groups
  const availableGroups = useMemo(() => {
    if (isHoA) return groups.sort((a,b) => a.name.localeCompare(b.name));
    return groups.filter(g => g.heads.some(h => h.id === me.id)).sort((a,b) => a.name.localeCompare(b.name));
  }, [groups, me, isHoA]);

  const [sessionId, setSessionId] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'mark' | 'overview'>('mark');

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<RosterRow[] | null>(null);

  const [grid, setGrid] = useState<AttendanceGrid | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const session = sessions.find((s) => s.id === sessionId) ?? null;
  const group = groups.find((g) => g.id === groupId) ?? null;
  const ready = !!(sessionId && groupId);

  const load = useCallback(async () => {
    if (!sessionId || !groupId) return;
    setLoading(true);
    setLoadError(null);
    setSaved(null);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/attendance?groupId=${encodeURIComponent(groupId)}`);
      const payload = (await res.json().catch(() => null)) as RosterRow[] | { error?: { message: string } } | null;
      if (!res.ok) {
        setLoadError((payload as { error?: { message: string } })?.error?.message ?? 'Could not load the roster.');
        setRows(null);
        return;
      }
      setRows((payload as RosterRow[]).map(r => ({ ...r, status: r.status || 'pending' })));
    } catch {
      setLoadError('Network error while loading roster.');
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId, groupId]);

  useEffect(() => {
    load();
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

  function setStatus(userId: string, status: StatusKey) {
    setRows((prev) => (prev ? prev.map((r) => (r.userId === userId ? { ...r, status } : r)) : null));
    setSaved(null);
  }

  function markEveryonePresent() {
    setRows((prev) => (prev ? prev.map((r) => ({ ...r, status: 'present' })) : null));
    setSaved(null);
  }

  async function save() {
    if (!rows || !sessionId || !groupId) return;
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
      setSaved(`Saved at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`);
    } catch {
      setSaveError('Network error while saving.');
    } finally {
      setSaving(false);
    }
  }

  const counts: Record<string, number> = {};
  if (rows) {
    for (const row of rows) {
      if (!counts[row.status]) counts[row.status] = 0;
      counts[row.status]++;
    }
  }
  const total = rows ? rows.length : 0;
  const presentPct = total ? Math.round(((counts.present ?? 0) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-500 text-white shadow-xs">
              <Icon name="calendar" className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Take Attendance</h1>
              <p className="mt-1 text-sm text-slate-500">
                Track presence, manage excuses, and monitor consistency for your cohorts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Control Bar */}
      <section className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Session</label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
          >
            <option value="" disabled>Choose a session...</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.name} {s.date ? `(${s.date})` : ''}</option>
            ))}
          </select>
          {session && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {session.startTime ?? 'Time TBD'} · {session.location ?? 'Remote'}
            </p>
          )}
        </div>

        <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Group</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
          >
            <option value="" disabled>Choose a group...</option>
            {availableGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name} {g.country ? `(${g.country})` : ''}</option>
            ))}
          </select>
          {group && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Icon name="users" className="h-3.5 w-3.5" />
              {group.studentCount} active students
            </p>
          )}
        </div>
      </section>

      {ready && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 font-semibold text-sm shadow-xs">
            <button
              onClick={() => setActiveTab('mark')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${activeTab === 'mark' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon name="checkCircle" className="h-4 w-4" />
              Mark Attendance
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${activeTab === 'overview' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon name="chart" className="h-4 w-4" />
              Monthly Overview
            </button>
          </div>

          {activeTab === 'mark' && (
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <h2 className="text-base font-bold text-slate-900">Session Roster</h2>
                {rows && (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                      {presentPct}% Present
                    </span>
                    {STATUS_ORDER.map((key) => (
                      <span key={key} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GRID_COLOR[key] }} />
                        {counts[key] ?? 0}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500 mb-3"></div>
                  <p className="text-sm font-medium text-slate-500">Loading roster...</p>
                </div>
              ) : loadError ? (
                <div className="px-6 py-16 text-center text-red-600">
                  <Icon name="x" className="mx-auto h-8 w-8 text-red-500 mb-3 opacity-50" />
                  <p className="text-sm font-medium">{loadError}</p>
                  <button onClick={load} className="mt-4 text-xs font-bold text-slate-500 hover:text-slate-800 underline">Try Again</button>
                </div>
              ) : !rows || rows.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Icon name="users" className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-500">No students found in this group.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-6 py-3 text-left">Student</th>
                        <th className="px-6 py-3 text-left">Check-in Time</th>
                        <th className="px-6 py-3 text-right">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row) => {
                        const active = row.status in STATUS_META ? (row.status as StatusKey) : null;
                        return (
                          <tr key={row.userId} className="hover:bg-slate-50/50 transition">
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Avatar name={row.name} url={row.avatarUrl} />
                                <span className="text-sm font-bold text-slate-800">{row.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-500">
                              {(row.status === 'present' || row.status === 'late') && row.checkInAt ? (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold">
                                  <Icon name="clock" className="h-3 w-3" />
                                  {new Date(row.checkInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <div className="inline-flex rounded-xl bg-slate-100 p-1 shadow-inner">
                                {STATUS_ORDER.map((key) => {
                                  const isActive = active === key;
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => setStatus(row.userId, key)}
                                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                        isActive
                                          ? STATUS_META[key].active + ' shadow-sm scale-105'
                                          : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                                      }`}
                                    >
                                      {STATUS_META[key].label}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {rows && rows.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <button
                    type="button"
                    onClick={markEveryonePresent}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
                  >
                    Mark Everyone Present
                  </button>
                  <div className="flex items-center gap-4">
                    {saveError && <span className="text-sm font-bold text-red-600">{saveError}</span>}
                    {saved && <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5"><Icon name="checkCircle" className="h-4 w-4" /> {saved}</span>}
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Attendance'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'overview' && grid && grid.sessions.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <h2 className="text-base font-bold text-slate-900">Monthly Overview</h2>
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                  {new Date().toISOString().slice(0, 7)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-bold">Student</th>
                      {grid.sessions.map((s) => (
                        <th key={s.id} className="px-2 py-4 text-center font-bold" title={s.name}>
                          {s.date.slice(8)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {grid.students.map((st) => (
                      <tr key={st.userId} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-3 font-semibold text-slate-800 whitespace-nowrap">{st.name}</td>
                        {grid.sessions.map((s) => {
                          const status = st.cells[s.id];
                          return (
                            <td key={s.id} className="px-2 py-3 text-center">
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-full shadow-xs"
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
              <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold text-slate-500 flex flex-wrap gap-4">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GRID_COLOR.present }} /> Present</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GRID_COLOR.late }} /> Late</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GRID_COLOR.excused }} /> Excused</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GRID_COLOR.absent }} /> Absent</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#e2e8f0' }} /> Unmarked</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
