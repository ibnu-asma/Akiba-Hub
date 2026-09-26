import { proxyAction } from '@/lib/bff';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  return proxyAction('/roadmaps', body);
}
