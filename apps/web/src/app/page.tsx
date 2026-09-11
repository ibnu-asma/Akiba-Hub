import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { HUB_COOKIE } from '@/lib/session';

export default async function Home() {
  const jar = await cookies();
  redirect(jar.get(HUB_COOKIE)?.value ? '/dashboard' : '/login');
}
