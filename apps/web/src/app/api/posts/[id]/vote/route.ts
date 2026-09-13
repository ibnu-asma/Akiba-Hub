import { proxyAction } from '@/lib/bff';

/** Any authenticated user: up (+1) or down (-1) vote a post (SPEC §6.7). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Vote value is required.' } }, { status: 400 });
  }
  return proxyAction(`/posts/${id}/vote`, body);
}
