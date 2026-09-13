import { proxyGet } from '@/lib/bff';

/** HoE/HoA: monthly attendance grid for a group (SPEC §7.4). */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams.toString();
  return proxyGet(`/sessions/attendance-grid${params ? `?${params}` : ''}`);
}
