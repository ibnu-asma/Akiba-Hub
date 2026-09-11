import { ROLE_NAMES } from '@hub/shared';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { Icon } from './icon';
import { sectionsFor } from '@/lib/nav';
import type { Me } from '@/lib/api';

/** Persistent quick-settings affordance bottom-right (SPEC §4). */
function Fab() {
  return (
    <button
      className="fixed bottom-6 right-6 z-20 grid h-12 w-12 place-items-center rounded-full bg-a2sv-500 text-white shadow-lg transition hover:bg-a2sv-600"
      aria-label="Quick settings"
    >
      <Icon name="sliders" className="h-5 w-5" />
    </button>
  );
}

/** Application chrome: sidebar + topbar + content well (SPEC §4.1–4.2). */
export function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  const roleLabel = ROLE_NAMES[me.role as keyof typeof ROLE_NAMES] ?? me.role;

  return (
    <div className="flex min-h-screen">
      <Sidebar roleLabel={roleLabel} sections={sectionsFor(me.role)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={me.name} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      </div>
      <Fab />
    </div>
  );
}
