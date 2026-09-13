import { proxyAction, proxyGet } from '@/lib/bff';

/** Any authenticated user: list forum posts (SPEC §6.7). */
export async function GET(req: Request) {
  const sort = new URL(req.url).searchParams.get('sort') ?? 'latest';
  return proxyGet(`/posts?sort=${sort}`);
}

/** Any authenticated user: create a forum post (SPEC §6.7). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Post title and body are required.' } }, { status: 400 });
  }
  return proxyAction('/posts', body);
}
