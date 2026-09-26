'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/student/problem-solve-card';
import type { RoadmapDto } from '@/lib/api';

export function RoadmapView({ roadmap, completedItemIds, isHead }: { roadmap: RoadmapDto; completedItemIds: string[]; isHead?: boolean }) {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedItemIds));
  const [busy, setBusy] = useState<Set<string>>(new Set());
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(roadmap.sections.map(s => s.id))
  );

  const totalItems = roadmap.sections.reduce((acc, s) => acc + s.items.length, 0);
  const progress = totalItems === 0 ? 0 : (completed.size / totalItems) * 100;

  async function toggleComplete(itemId: string) {
    if (busy.has(itemId)) return;
    
    const next = new Set(completed);
    const wasCompleted = next.has(itemId);
    if (wasCompleted) next.delete(itemId);
    else next.add(itemId);
    setCompleted(next);

    setBusy(new Set(busy).add(itemId));
    try {
      const res = await fetch(`/api/roadmaps/items/${itemId}/toggle`, { method: 'POST' });
      if (!res.ok) throw new Error('Toggle failed');
      const data = await res.json();
      const finalSet = new Set(completed);
      if (data.completed) finalSet.add(itemId);
      else finalSet.delete(itemId);
      setCompleted(finalSet);
      router.refresh(); 
    } catch {
      setCompleted(completed);
    } finally {
      const nextBusy = new Set(busy);
      nextBusy.delete(itemId);
      setBusy(nextBusy);
    }
  }

  const toggleSection = (id: string) => {
    const next = new Set(expandedSections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSections(next);
  };

  const getPlatformIcon = (type: string) => {
    if (type === 'video') return <Icon name="trend" className="h-4 w-4 text-red-500" />;
    if (type === 'reading') return <Icon name="file" className="h-4 w-4 text-blue-500" />;
    return <Icon name="code" className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{roadmap.title}</h1>
            <span className="chip bg-a2sv-500 text-white font-medium text-xs">Roadmap</span>
          </div>
          {roadmap.description && (
            <p className="mt-1 text-sm text-slate-500 max-w-3xl leading-relaxed">
              {roadmap.description}
            </p>
          )}
        </div>
        {isHead && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/roadmaps/${roadmap.id}/edit`} className="btn-secondary py-1.5 px-3 text-sm">
              Edit Roadmap
            </Link>
            <Link href={`/roadmaps/${roadmap.id}/sections/new`} className="btn-primary py-1.5 px-3 text-sm shadow-sm">
              + Add Section
            </Link>
          </div>
        )}
      </header>

      {/* Main Progress Card */}
      <section className="card p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <h2 className="text-sm font-bold text-slate-800 shrink-0">
              Overall Progress
            </h2>
            <div className="flex-1 flex items-center gap-4">
              <span className="text-base font-extrabold text-a2sv-500 w-12 text-right">
                {Math.round(progress)}%
              </span>
              <div className="flex-1">
                <ProgressBar value={completed.size} max={totalItems || 1} label="Overall Progress" />
              </div>
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                {completed.size} / {totalItems}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Sections (Compact Accordion Table Layout) */}
      <div className="space-y-3">
        {roadmap.sections.map((section, si) => {
          const sectionCompleted = section.items.filter((i) => completed.has(i.id)).length;
          const isExpanded = expandedSections.has(section.id);
          const isDone = section.items.length > 0 && sectionCompleted === section.items.length;
          
          return (
            <div key={section.id} className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
              {/* Accordion Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full px-5 py-4 flex items-center justify-between text-left transition-colors ${
                  isExpanded ? 'bg-slate-50 border-b border-slate-200/80' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${
                    isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isDone ? <Icon name="check" className="w-4 h-4" /> : (si + 1)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-emerald-500' : 'bg-a2sv-500'}`} 
                          style={{ width: `${section.items.length === 0 ? 0 : (sectionCompleted / section.items.length) * 100}%` }} 
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">{sectionCompleted} / {section.items.length}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 ml-4">
                  <Icon 
                    name="chevronDown" 
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                  />
                </div>
              </button>

              {/* Accordion Content (Compact Table) */}
              {isExpanded && (
                <div className="bg-white">
                  {section.items.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      No resources available in this section yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="w-16 px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 font-semibold">Resource Title</th>
                            <th className="w-24 px-4 py-3 text-center font-semibold">Type</th>
                            <th className="w-24 px-4 py-3 text-center font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {section.items.map((item) => {
                            const isChecked = completed.has(item.id);
                            const isProcessing = busy.has(item.id);

                            return (
                              <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-[#f0fdf4]/30' : ''}`}>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => toggleComplete(item.id)}
                                    className={`inline-flex h-5 w-5 items-center justify-center rounded border transition focus:outline-none focus:ring-2 focus:ring-a2sv-500 ${
                                      isProcessing ? 'opacity-50 cursor-wait' : ''
                                    } ${
                                      isChecked
                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                        : 'border-slate-300 bg-white hover:border-emerald-500'
                                    }`}
                                    aria-label="Toggle completion"
                                  >
                                    {isChecked && <Icon name="check" className="h-3.5 w-3.5" />}
                                  </button>
                                </td>
                                <td className="px-4 py-3 font-medium">
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`hover:text-a2sv-600 transition-colors ${isChecked ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                                  >
                                    {item.title}
                                  </a>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100/80 text-[10px] font-bold text-slate-600 uppercase tracking-wider w-full">
                                    {item.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
                                    title={`Open ${item.type}`}
                                  >
                                    {getPlatformIcon(item.type)}
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {roadmap.sections.length === 0 && (
          <div className="card p-10 text-center bg-white rounded-2xl border border-slate-100">
            <p className="text-3xl">📚</p>
            <p className="mt-2 text-sm text-slate-500">No sections have been added to this roadmap yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
