'use client';

import Link from 'next/link';
import { Icon } from '@/components/icon';
import type { Group } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

import { Avatar } from '@/components/avatar';

export function GroupCard({ group }: { group: Group }) {
  const visibleStudents = group.students.slice(0, 4);
  const remainingStudents = Math.max(0, group.studentCount - visibleStudents.length);

  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-emerald-300/80 transition-all group">
      <div>
        {/* Top Row: Short name badge + SuperGroup pill + Group Name + Action */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <span className="flex h-6 px-2 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700 border border-emerald-200/60">
              {group.shortName}
            </span>

            {group.superGroupName && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 bg-slate-100 text-slate-700 truncate max-w-[150px]">
                {group.superGroupName}
              </span>
            )}

            <Link
              href={`/groups/${group.id}`}
              className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition truncate"
              title={group.name}
            >
              {group.name}
            </Link>
          </div>

          
        </div>

        {/* Middle Metadata: Heads + Country + Description */}
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {group.country && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 text-slate-600 text-[11px] font-medium">
                <span>🌍</span>
                <span>{group.country}</span>
              </span>
            )}

            {group.heads.length > 0 ? (
              group.heads.map((h) => (
                <span
                  key={h.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium"
                >
                  <Icon name="shield" className="h-3 w-3" />
                  <span>{h.name}</span>
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-400 italic">No head assigned</span>
            )}
          </div>

          {group.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{group.description}</p>
          )}
        </div>
      </div>

      {/* Bottom Row: Student Count Badge + Avatar Stack + Link Button */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Avatar stack */}
          {visibleStudents.length > 0 ? (
            <div className="flex items-center -space-x-1.5">
              {visibleStudents.map((s) => (
                <Avatar key={s.id} name={s.name} url={s.avatarUrl} />
              ))}
              {remainingStudents > 0 && (
                <span className="h-6 w-6 grid place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 border border-white shadow-xs">
                  +{remainingStudents}
                </span>
              )}
            </div>
          ) : null}

          <span className="chip bg-slate-100 text-slate-600 text-[11px] font-semibold">
            {group.studentCount} student{group.studentCount === 1 ? '' : 's'}
          </span>
        </div>

        <Link
          href={`/groups/${group.id}`}
          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
        >
          View details
        </Link>
      </div>
    </article>
  );
}

