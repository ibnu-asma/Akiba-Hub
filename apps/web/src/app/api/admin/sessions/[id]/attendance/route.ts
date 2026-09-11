import { proxyAction, proxyGet } from '@/lib/bff';

interface AttendanceCtx {
  params: Promise<{ id: string }>;
}

/** HoE/HoA: roster for a session/group with current statuses (SPEC §7.4). */
export async function GET(req: Request, ctx: AttendanceCtx) {
  const { id } = await ctx.params;
  const groupId = new URL(req.url).searchParams.get('groupId') ?? '';
  return proxyGet(`/sessions/${id}/attendance?groupId=${encodeURIComponent(groupId)}`);
}

/** HoE/HoA: mark attendance for the roster (SPEC §7.4). */
export async function POST(req: Request, ctx: AttendanceCtx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Attendance rows are required.' } }, { status: 400 });
  }
  return proxyAction(`/sessions/${id}/attendance`, body);
}