import { proxyAction, proxyGet } from '@/lib/bff';

/** HoE/HoA: read a fund's stipends (manager table). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(`/funds/${id}/stipends`);
}

/** HoE/HoA: batch-assign monthly stipends from a fund (idempotent upsert). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Pick at least one student and a monthly amount.' } },
      { status: 400 },
    );
  }
  return proxyAction(`/funds/${id}/stipends`, body);
}