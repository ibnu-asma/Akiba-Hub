import { proxyGet } from '@/lib/bff';

/** Search users, scholars, and problems across the academy. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  return proxyGet(`/users/search?q=${encodeURIComponent(q)}`);
}

