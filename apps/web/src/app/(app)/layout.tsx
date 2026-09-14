import { redirect } from 'next/navigation';
import { getMe } from '@/lib/api';
import { AppShell } from '@/components/app-shell';

/** Authenticated shell — middleware guards the route; this guarantees the principal. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect('/api/auth/logout');
  return <AppShell me={me}>{children}</AppShell>;
}
