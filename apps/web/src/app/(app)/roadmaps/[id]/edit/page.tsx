import { notFound, redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type RoadmapDto } from '@/lib/api';
import { RoadmapBuilder } from '@/components/head/roadmap-builder';

export default async function EditRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');
  
  const { id } = await params;
  const roadmap = await safe(hubFetch<RoadmapDto>(`/roadmaps/${id}`));
  if (!roadmap) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Roadmap</h1>
        <p className="mt-1 text-sm text-slate-500">
          Reorder sections, add items, and update details for <strong>{roadmap.title}</strong>.
        </p>
      </header>
      <RoadmapBuilder initialRoadmap={roadmap} />
    </div>
  );
}
