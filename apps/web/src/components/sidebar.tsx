'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icon';
import type { NavItem, NavSection } from '@/lib/nav';

/** Role-scoped sidebar (1/2/3-section rule) — sticky on desktop, drawer on mobile. */
export function Sidebar({
  roleLabel,
  sections,
  drawerOpen,
  onDrawerClose,
}: {
  roleLabel: string;
  sections: NavSection[];
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
}) {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarHeader roleLabel={roleLabel} />
        <NavList sections={sections} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-slate-900/30" onClick={onDrawerClose} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <SidebarHeader roleLabel={roleLabel} />
            <NavList sections={sections} onNavigate={onDrawerClose} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarHeader({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="px-5 pb-4 pt-5">
      <span className="avatar h-12 w-12" aria-hidden="true">
        <Icon name="user" className="h-5 w-5" />
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-status-present" />
      </span>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-a2sv-500 text-white">
          <Icon name="code" className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-base font-bold tracking-tight text-slate-900">HUB</p>
          <p className="text-[11px] font-medium text-slate-400">{roleLabel}</p>
        </div>
      </div>
    </div>
  );
}

function NavList({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto pb-8">
      {sections.map((section, index) => (
        <div key={section.id} className={index > 0 ? 'mt-5 border-t border-slate-100 pt-5' : ''}>
          <p className="nav-section-title">{section.title}</p>
          <ul className="space-y-0.5 px-3">
            {section.items.map((item) => (
              <NavItemRow key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavItemRow({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const childActive = item.children?.some((c) => pathname.startsWith(c.href)) ?? false;
  const parentActive = pathname === item.href;
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  if (item.children?.length) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            open || childActive ? 'bg-a2sv-50 font-semibold text-a2sv-700' : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Icon name={item.icon} className={`h-[18px] w-[18px] shrink-0 ${open || childActive ? 'text-a2sv-600' : 'text-slate-400'}`} />
          <span className="flex-1 text-left">{item.label}</span>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} className="h-4 w-4 text-slate-400" />
        </button>
        {open && (
          <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
            {item.children.map((child) => {
              const active = pathname.startsWith(child.href);
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    className={`block truncate rounded-lg px-3 py-2 text-sm transition ${
                      active ? 'bg-a2sv-50 font-semibold text-a2sv-700' : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  const active = parentActive;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
          active ? 'bg-a2sv-50 font-semibold text-a2sv-700' : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Icon name={item.icon} className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-a2sv-600' : 'text-slate-400'}`} />
        {item.label}
      </Link>
    </li>
  );
}
