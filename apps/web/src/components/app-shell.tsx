import { ROLE_NAMES } from '@hub/shared';
import { ShellFrame } from './shell-frame';
import { sectionsFor } from '@/lib/nav';
import type { Me } from '@/lib/api';

/** Server shell — resolves the principal, then renders the client frame. */
export function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  const roleLabel = ROLE_NAMES[me.role as keyof typeof ROLE_NAMES] ?? me.role;
  return (
    <ShellFrame roleLabel={roleLabel} sections={sectionsFor(me.role)} name={me.name}>
      {children}
    </ShellFrame>
  );
}
