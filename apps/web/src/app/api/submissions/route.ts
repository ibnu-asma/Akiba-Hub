import { proxyAction } from '@/lib/bff';

/** Student (any authenticated user): log a solve — manual form or extension (SPEC §6.4/§6.5). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Submission details are required.' } },
      { status: 400 },
    );
  }
  return proxyAction('/submissions', body);
}
