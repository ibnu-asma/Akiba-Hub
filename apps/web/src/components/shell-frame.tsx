'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { Icon } from './icon';
import type { NavSection } from '@/lib/nav';
import type { Me } from '@/lib/api';

/** Client frame: owns the mobile-drawer state, composes sidebar + topbar + FAB. */
export function ShellFrame({
  roleLabel,
  sections,
  me,
  name,
  children,
}: {
  roleLabel: string;
  sections: NavSection[];
  me?: Me;
  name?: string;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const resolvedName = me?.name ?? name ?? 'User';

  return (
    <div className="flex min-h-screen">
      <Sidebar
        roleLabel={roleLabel}
        sections={sections}
        drawerOpen={drawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          me={me}
          name={resolvedName}
          sections={sections}
          onMenu={() => setDrawerOpen(true)}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <button
        className="fixed bottom-6 right-6 z-20 hidden h-12 w-12 place-items-center rounded-full bg-a2sv-500 text-white shadow-lg shadow-a2sv-500/40 transition hover:bg-a2sv-600 sm:grid"
        aria-label="Quick settings"
      >
        <Icon name="sliders" className="h-5 w-5" />
      </button>
    </div>
  );
}