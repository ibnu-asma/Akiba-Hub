import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe } from '@/lib/api';
import { RoadmapBuilder } from '@/components/head/roadmap-builder';

/** HoE/HoA: roadmap management — create structured curriculum resource hubs. */
export default async function NewRoadmapPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Roadmap</h1>
        <p className="mt-1 text-sm text-slate-500">
          Build a structured resource hub for students. Add sections and categorized links.
        </p>
      </header>
      <RoadmapBuilder />
    </div>
  );
}
