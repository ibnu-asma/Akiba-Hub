import { proxyAction } from '@/lib/bff';

/** HoE/HoA: mark a stipend paid (or back to pending). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Status is required.' } }, { status: 400 });
  }
  return proxyAction(`/funds/stipends/${id}`, body, 'PATCH');
}