'use client';

import { useMemo, useState } from 'react';
import { SuperGroupCreateModal } from '@/components/admin/super-group-create-modal';
import { SuperGroupDetailModal } from '@/components/admin/super-group-detail-modal';
import type { SelectUserOption } from '@/components/form/select-user';
import type { Group, SuperGroup } from '@/lib/api';

/** HoA: super-group management — cards + create/detail modals (SPEC §8.4). */
export function SuperGroupsManager({
  initialSuperGroups,
  groups,
}: {
  initialSuperGroups: SuperGroup[];
  groups: Group[];
}) {
  const [superGroups, setSuperGroups] = useState<SuperGroup[]>(initialSuperGroups);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const groupOptions: SelectUserOption[] = useMemo(
    () => groups.map((g) => ({ id: g.id, name: g.name, role: 'Group' })),
    [groups],
  );
  const selected = superGroups.find((sg) => sg.id === selectedId) ?? null;

  async function reload() {
    const res = await fetch('/api/admin/super-groups');
    const rows = (await res.json().catch(() => null)) as SuperGroup[] | null;
    if (res.ok && rows) setSuperGroups(rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          + New super group
        </button>
      </div>

      {superGroups.length === 0 ? (
        <section className="card p-10 text-center">
          <p className="text-3xl">🗂️</p>
          <p className="mt-2 text-sm text-slate-500">No super groups yet — create the first one.</p>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {superGroups.map((sg) => (
            <li key={sg.id}>
              <button
                type="button"
                onClick={() => setSelectedId(sg.id)}
                className="card group flex h-full w-full flex-col p-5 text-left transition hover:border-a2sv-400 hover:ring-2 hover:ring-a2sv-100"
              >
                <h3 className="truncate text-base font-bold text-slate-900">{sg.name}</h3>
                <p className="text-xs text-slate-400">
                  {sg.groups.length} group{sg.groups.length === 1 ? '' : 's'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sg.groups.length === 0 ? (
                    <span className="text-xs text-slate-400">No groups assigned</span>
                  ) : (
                    sg.groups.map((g) => (
                      <span key={g.id} className="chip bg-slate-100 text-slate-600">
                        {g.shortName}
                      </span>
                    ))
                  )}
                </div>
                <span className="mt-auto pt-3 text-right text-xs font-semibold text-a2sv-600 opacity-0 transition group-hover:opacity-100">
                  View details →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {createOpen && (
        <SuperGroupCreateModal
          groupOptions={groupOptions}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void reload();
          }}
        />
      )}

      {selected && (
        <SuperGroupDetailModal
          superGroup={selected}
          groupOptions={groupOptions}
          onClose={() => setSelectedId(null)}
          onChanged={() => void reload()}
        />
      )}
    </div>
  );
}
