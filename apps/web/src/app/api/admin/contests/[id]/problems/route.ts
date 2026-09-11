import { proxyAction } from '@/lib/bff';

/** HoE/HoA: attach contest questions — pseudo letters A, B, C… (SPEC §7.6). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Select at least one problem.' } }, { status: 400 });
  }
  return proxyAction(`/contests/${id}/problems`, body);
}