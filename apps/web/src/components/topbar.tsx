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

/** Utility bar: search left · AI assist / notifications / avatar+dot / logout right (SPEC §4.2). */
export function Topbar({
  name,
  onMenu,
  notifications = 0,
}: {
  name: string;
  onMenu?: () => void;
  notifications?: number;
}) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
      <button className="icon-btn lg:hidden" aria-label="Open menu" onClick={onMenu}>
        <Icon name="menu" />
      </button>
      <div className="relative hidden w-full max-w-sm sm:block">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
        <input placeholder="Search..." aria-label="Search" className="field-input py-2.5 pl-10" />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button className="icon-btn" aria-label="AI assist">
          <Icon name="sparkles" />
        </button>
        <button className="icon-btn relative" aria-label="Notifications">
          <Icon name="bell" />
          {notifications > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
        </button>
        <span className="relative ml-1.5" title={name}>
          <span className="avatar h-9 w-9 text-[11px] font-semibold">{initials(name)}</span>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-status-present" />
        </span>
        <span className="mx-1.5 h-6 w-px bg-slate-200" />
        <button className="icon-btn" aria-label="Log out" onClick={logout}>
          <Icon name="logout" />
        </button>
      </div>
    </header>
  );
}
