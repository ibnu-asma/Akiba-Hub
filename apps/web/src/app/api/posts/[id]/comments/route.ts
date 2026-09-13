import { proxyAction, proxyGet } from '@/lib/bff';

/** Any authenticated user: read a post's comment thread (SPEC §6.7). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(`/posts/${id}/comments`);
}

/** Any authenticated user: write a comment (SPEC §6.7). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Comment body is required.' } }, { status: 400 });
  }
  return proxyAction(`/posts/${id}/comments`, body);
}
