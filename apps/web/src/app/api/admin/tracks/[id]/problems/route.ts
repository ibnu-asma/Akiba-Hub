import { proxyAction } from '@/lib/bff';

interface TrackProblemsCtx {
  params: Promise<{ id: string }>;
}

/** HoE/HoA: attach problems to a track — the "Add exercise" flow (SPEC §7.5). */
export async function POST(req: Request, ctx: TrackProblemsCtx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Problem selection is required.' } }, { status: 400 });
  }
  return proxyAction(`/tracks/${id}/problems`, body);
}