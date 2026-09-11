'use client';

import { useRouter } from 'next/navigation';
import { Icon } from './icon';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** Right-aligned utility bar: search · AI assist · notifications · avatar · logout (SPEC §4.2). */
export function Topbar({ name, notifications = 0 }: { name: string; notifications?: number }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-end gap-1 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur">
      <button className="icon-btn" aria-label="Search">
        <Icon name="search" />
      </button>
      <button className="icon-btn" aria-label="AI assist">
        <Icon name="sparkles" />
      </button>
      <button className="icon-btn relative" aria-label="Notifications">
        <Icon name="bell" />
        {notifications > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {notifications > 99 ? '99+' : notifications}
          </span>
        )}
      </button>
      <div className="relative ml-1.5" title={name}>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-a2sv-100 text-xs font-bold text-a2sv-700">
          {initials(name)}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-status-present" />
      </div>
      <span className="mx-2 h-6 w-px bg-slate-200" />
      <button className="icon-btn" aria-label="Log out" onClick={logout}>
        <Icon name="logout" />
      </button>
    </header>
  );
}
