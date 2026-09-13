import { proxyAction } from '@/lib/bff';

/** HoE/HoA: reassign problems from one track to another (SPEC §7.6). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Reassign selection is required.' } }, { status: 400 });
  }
  return proxyAction(`/tracks/${id}/reassign`, body);
}
