'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROLES, ROLE_NAMES, type Role } from '@hub/shared';
import { OutlinedSelect } from '@/components/form/field';
import { UserDetailModal } from '@/components/admin/user-detail-modal';
import type { Group, UserSummaryDto } from '@/lib/api';

const PAGE_SIZE = 10;
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

/** HoA: Roles — server-paginated, searchable, filterable user list with edit modal (SPEC §8.7). */
export function RolesManager({ groups }: { groups: Group[] }) {
  const [tab, setTab] = useState<'active' | 'removed'>('active');
  const [search, setSearch] = useState('');
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

  function applySearch() {
    setQ(search.trim());
    setPage(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-1.5">
          {(['active', 'removed'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setPage(0);
                setRoleFilter('');
              }}
              className={`chip px-4 py-2 text-sm capitalize transition ${
                tab === t ? 'bg-a2sv-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applySearch();
            }}
            className="flex items-end gap-2"
          >
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…" className="field-input w-52 py-2 text-sm" />
            <button type="submit" className="btn-primary px-4 py-2 text-sm">
              Search
            </button>
          </form>
          {tab === 'active' && (
            <div className="w-44">
              <OutlinedSelect
                label="Role"
                value={roleFilter}
                onChange={(v) => {
                  setRoleFilter(v);
                  setPage(0);
                }}
                placeholder="All roles"
                options={[{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]}
              />
            </div>
          )}
        </div>
      </div>

      <section className="card overflow-hidden">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">Loading…</p>
        ) : data.rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">No users match.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Group</th>
                {tab === 'active' && <th className="px-4 py-3 font-semibold" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((u) => (
                <tr
                  key={u.id}
                  onClick={tab === 'active' ? () => setSelectedId(u.id) : undefined}
                  className={tab === 'active' ? 'cursor-pointer transition hover:bg-a2sv-50/40' : ''}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="avatar h-9 w-9 text-[11px]">{initials(u.name)}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{u.name}</p>
                        <p className="truncate text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip ${ROLE_BADGE[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {ROLE_NAMES[u.role as Role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.groupId ? (groupName.get(u.groupId) ?? '—') : '—'}</td>
                  {tab === 'active' && <td className="px-4 py-3 text-right text-xs font-semibold text-a2sv-600">Edit →</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{data.total} total</span>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            ← Prev
          </button>
          <span className="text-xs text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      </div>

      {selected && (
        <UserDetailModal user={selected} groups={groups} onClose={() => setSelectedId(null)} onChanged={() => void load()} />
      )}
    </div>
  );
}

