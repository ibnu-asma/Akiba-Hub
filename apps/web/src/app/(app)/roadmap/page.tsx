import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type RoadmapDto } from '@/lib/api';
import Link from 'next/link';

export default async function RoadmapLandingPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  const isStudent = (ROLE_LEVEL[me.role as Role] ?? 1) === 1;

  // fetch roadmaps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roadmaps = (await safe(hubFetch<any[]>('/roadmaps'))) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Resource Roadmaps</h1>
          <p className="mt-1 text-sm text-slate-500">
            Explore curated learning paths, reading materials, videos, and practice problems.
          </p>
        </div>
        {!isStudent && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/roadmaps/new" className="btn-primary py-2 px-4 text-sm shadow-sm">
              + Add Roadmap
            </Link>
          </div>
        )}
      </header>

      {roadmaps.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-2 border-slate-200">
          <p className="text-slate-500 mb-4">No roadmaps have been created yet.</p>
          {!isStudent && (
            <Link href="/roadmaps/new" className="btn-primary inline-flex">
              + Create your first Roadmap
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map((r) => (
            <Link key={r.id} href={`/roadmaps/${r.id}`} className="card p-5 hover:border-a2sv-500 transition hover:shadow-md group block relative">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-a2sv-700 transition">{r.title}</h3>
              <p className="mt-2 text-sm text-slate-500 line-clamp-3">
                {r.description || 'No description provided.'}
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>{r.sections?.length || 0} Sections</span>
                <span className="text-a2sv-600 group-hover:translate-x-1 transition-transform inline-block">Explore →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
