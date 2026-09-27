'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROLES, ROLE_NAMES, type Role } from '@hub/shared';
import { UserDetailModal } from '@/components/admin/user-detail-modal';
import { Icon } from '@/components/icon';
import type { Group, UserSummaryDto } from '@/lib/api';

const PAGE_SIZE = 15;
const ROLE_OPTIONS = Object.values(ROLES).map((role) => ({ value: role, label: ROLE_NAMES[role as Role] }));

const ROLE_BADGE: Record<string, string> = {
  student: 'bg-slate-100 text-slate-600',
  head_of_education: 'bg-a2sv-50 text-a2sv-700',
  head_of_academy: 'bg-a2sv-100 text-a2sv-800',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function UsersManager({ groups }: { groups: Group[] }) {
  const [tab, setTab] = useState<'active' | 'removed'>('active');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ rows: UserSummaryDto[]; total: number }>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const groupName = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (q) params.set('q', q);
      if (tab === 'active' && roleFilter) params.set('role', roleFilter);
      const url = tab === 'active' ? '/api/admin/users' : '/api/admin/users/removed';
      const res = await fetch(`${url}?${params.toString()}`);
      const payload = (await res.json().catch(() => null)) as { rows?: UserSummaryDto[]; total?: number } | null;
      if (res.ok && payload) setData({ rows: payload.rows ?? [], total: payload.total ?? 0 });
      else setData({ rows: [], total: 0 });
    } catch {
      setData({ rows: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [tab, q, roleFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = data.rows.find((u) => u.id === selectedId) ?? null;
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Icon name="search" className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search name or email..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100"
            />
          </div>
          {tab === 'active' && (
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none text-slate-700 w-full sm:w-48"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1 font-semibold text-sm self-start md:self-auto w-full md:w-auto">
          {(['active', 'removed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setQ('');
                setRoleFilter('');
                setPage(0);
              }}
              className={`flex-1 md:flex-none rounded-lg px-4 py-1.5 capitalize transition-all ${
                tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Group</th>
                <th className="px-6 py-4 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : data.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                data.rows.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className="group hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="h-10 w-10 shrink-0 rounded-full object-cover border border-white shadow-xs" />
                        ) : (
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-800 text-sm border border-white shadow-xs">
                            {initials(u.name)}
                          </div>
                        )}
                        <span className="font-medium text-slate-900 group-hover:text-a2sv-600 transition">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.groupId ? (
                        <span className="text-slate-700">{groupName.get(u.groupId) ?? 'Unknown Group'}</span>
                      ) : (
                        <span className="text-slate-300">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`chip ${ROLE_BADGE[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ROLE_NAMES[u.role as Role] ?? u.role}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data.total > 0 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-sm text-slate-500">
              Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total} users
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Prev
              </button>
              <div className="hidden sm:flex items-center px-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  if (i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1) {
                    return (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${i === page ? 'bg-a2sv-500 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        {i + 1}
                      </button>
                    );
                  }
                  if (Math.abs(i - page) === 2) {
                    return <span key={i} className="text-slate-400 px-1">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <UserDetailModal
          user={selected}
          groups={groups}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}
