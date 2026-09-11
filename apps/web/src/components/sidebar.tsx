'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icon';
import type { NavSection } from '@/lib/nav';

/** Role-scoped sidebar — section visibility implements the 1/2/3 rule (SPEC §4). */
export function Sidebar({ roleLabel, sections }: { roleLabel: string; sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-a2sv-500 text-sm font-bold text-white">
          H
        </span>
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900">HUB</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pb-6">
        {sections.map((section, index) => (
          <div key={section.id} className={index > 0 ? 'mt-4 border-t border-slate-200 pt-4' : ''}>
            <p className="px-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            <ul>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        active
                          ? 'bg-a2sv-50 font-semibold text-a2sv-600'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
