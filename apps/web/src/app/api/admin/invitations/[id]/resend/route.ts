import { proxyAction } from '@/lib/bff';

/** HoA: re-issue a fresh token + re-send the invite email (SPEC §8.5 lifecycle). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyAction(`/invitations/${id}/resend`, {}, 'POST');
}
