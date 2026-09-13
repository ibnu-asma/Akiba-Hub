'use client';

import { useMemo, useState } from 'react';
import { OutlinedSelect } from '@/components/form/field';
import { AvatarStack } from '@/components/avatar-stack';
import { GroupCreateModal } from '@/components/admin/group-create-modal';
import { GroupDetailModal } from '@/components/admin/group-detail-modal';
import type { SelectUserOption } from '@/components/form/select-user';
import type { Group, SuperGroup, UserSummaryDto } from '@/lib/api';

const ALL = '__all__';

/** HoA: group management — filter, clickable cards, create + detail modals (SPEC §8.6, §11). */
export function GroupsManager({
  initialGroups,
  superGroups,
  users,
}: {
  initialGroups: Group[];
  superGroups: SuperGroup[];
  users: UserSummaryDto[];
}) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [filterSg, setFilterSg] = useState(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const groupName = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);
  const filtered = filterSg === ALL ? groups : groups.filter((g) => g.superGroupId === filterSg);
  const selected = groups.find((g) => g.id === selectedId) ?? null;

  const studentOptions: SelectUserOption[] = useMemo(
    () =>
      users
        .filter((u) => u.role === 'student' && !u.isRemoved)
        .sort((a, b) => (a.groupId ? 1 : 0) - (b.groupId ? 1 : 0))
        .map((u) => ({
          id: u.id,
          name: u.name,
          role: 'Student',
          group: u.groupId ? (groupName.get(u.groupId) ?? 'Assigned') : 'Unassigned',
        })),
    [users, groupName],
  );

  const headOptions: SelectUserOption[] = useMemo(
    () =>
      users
        .filter((u) => (u.role === 'head_of_education' || u.role === 'head_of_academy') && !u.isRemoved)
        .map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role === 'head_of_academy' ? 'Head of Academy' : 'Head of Education',
        })),
    [users],
  );

  async function reload() {
    const res = await fetch('/api/admin/groups');
    const rows = (await res.json().catch(() => null)) as Group[] | null;
    if (res.ok && rows) setGroups(rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-64">
          <OutlinedSelect
            label="Super group"
            value={filterSg}
            onChange={setFilterSg}
            placeholder="Select…"
            options={[{ value: ALL, label: 'All groups' }, ...superGroups.map((sg) => ({ value: sg.id, label: sg.name }))]}
          />
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          + New group
        </button>
      </div>

      {filtered.length === 0 ? (
        <section className="card p-10 text-center">
          <p className="text-3xl">🗂️</p>
          <p className="mt-2 text-sm text-slate-500">No groups{filterSg !== ALL ? ' in this super group' : ''} yet.</p>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                onClick={() => setSelectedId(group.id)}
                className="card group flex h-full w-full flex-col p-5 text-left transition hover:border-a2sv-400 hover:ring-2 hover:ring-a2sv-100"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="chip bg-a2sv-500 text-white">{group.shortName}</span>
                  {group.superGroupName && <span className="chip bg-slate-100 text-slate-500">{group.superGroupName}</span>}
                </div>
                <h3 className="mt-2 truncate text-base font-bold text-slate-900">{group.name}</h3>
                <p className="text-xs text-slate-400">
                  {[group.country, `${group.studentCount} student${group.studentCount === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                </p>
                {group.heads.length > 0 && (
                  <p className="mt-2 truncate text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">Heads:</span> {group.heads.map((h) => h.name).join(', ')}
                  </p>
                )}
                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <AvatarStack people={group.students} />
                  <span className="text-xs font-semibold text-a2sv-600 opacity-0 transition group-hover:opacity-100">View details →</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {createOpen && (
        <GroupCreateModal
          superGroups={superGroups}
          headOptions={headOptions}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void reload();
          }}
        />
      )}

      {selected && (
        <GroupDetailModal
          group={selected}
          superGroups={superGroups}
          headOptions={headOptions}
          studentOptions={studentOptions}
          onClose={() => setSelectedId(null)}
          onChanged={() => void reload()}
        />
      )}
    </div>
  );
}
