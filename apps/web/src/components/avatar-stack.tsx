import { getOptimizedAvatarUrl } from '@/lib/avatar';

export interface AvatarPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** Circular avatar stack (SPEC §9 `AvatarStack`) — shows first N, "+k" for the rest. */
export function AvatarStack({ people, max = 5 }: { people: AvatarPerson[]; max?: number }) {
  if (people.length === 0) {
    return <span className="text-xs text-slate-400">No students</span>;
  }
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2.5">
        {shown.map((p) => (
          <span
            key={p.id}
            title={p.name}
            className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-slate-500 text-[11px] font-semibold text-white ring-2 ring-white"
          >
            {p.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getOptimizedAvatarUrl(p.avatarUrl, 72) ?? p.avatarUrl} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              initials(p.name)
            )}
          </span>
        ))}
      </div>
      {extra > 0 && <span className="ml-2 text-xs font-medium text-slate-400">+{extra}</span>}
    </div>
  );
}
