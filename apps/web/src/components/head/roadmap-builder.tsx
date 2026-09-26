'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedInput } from '@/components/form/field';
import { Icon } from '@/components/icon';
import type { RoadmapDto } from '@/lib/api';

type Item = { id?: string; type: 'video' | 'reading' | 'problem'; title: string; link: string };
type Section = { id?: string; title: string; items: Item[] };

export function RoadmapBuilder({ initialRoadmap }: { initialRoadmap?: RoadmapDto }) {
  const router = useRouter();
  
  const [title, setTitle] = useState(initialRoadmap?.title ?? '');
  const [description, setDescription] = useState(initialRoadmap?.description ?? '');
  
  const [sections, setSections] = useState<Section[]>(
    initialRoadmap?.sections?.map(s => ({
      id: s.id,
      title: s.title,
      items: s.items.map(i => ({
        id: i.id,
        type: i.type as 'video' | 'reading' | 'problem',
        title: i.title,
        link: i.link
      }))
    })) ?? [{ title: '', items: [] }]
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSection = () => setSections([...sections, { title: '', items: [] }]);
  
  const updateSectionTitle = (i: number, val: string) => {
    const next = [...sections];
    next[i].title = val;
    setSections(next);
  };
  
  const addItem = (i: number) => {
    const next = [...sections];
    next[i].items.push({ type: 'reading', title: '', link: '' });
    setSections(next);
  };

  const updateItem = (si: number, ii: number, field: keyof Item, val: string) => {
    const next = [...sections];
    // @ts-expect-error dynamic assignment
    next[si].items[ii][field] = val;
    setSections(next);
  };

  const removeItem = (si: number, ii: number) => {
    const next = [...sections];
    next[si].items.splice(ii, 1);
    setSections(next);
  };

  const removeSection = (si: number) => {
    const next = [...sections];
    next.splice(si, 1);
    setSections(next);
  };

  const moveSection = (si: number, dir: -1 | 1) => {
    const next = [...sections];
    if (si + dir < 0 || si + dir >= next.length) return;
    const temp = next[si];
    next[si] = next[si + dir];
    next[si + dir] = temp;
    setSections(next);
  };

  const moveItem = (si: number, ii: number, dir: -1 | 1) => {
    const next = [...sections];
    const items = next[si].items;
    if (ii + dir < 0 || ii + dir >= items.length) return;
    const temp = items[ii];
    items[ii] = items[ii + dir];
    items[ii + dir] = temp;
    setSections(next);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const url = initialRoadmap ? `/api/roadmaps/${initialRoadmap.id}` : '/api/roadmaps';
      const method = initialRoadmap ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, sections }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error?.message ?? 'Failed to save roadmap');
      }
      
      router.push('/roadmap');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col lg:flex-row gap-8 items-start">
      {/* LEFT COLUMN: Metadata & Actions */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-6 lg:sticky lg:top-8">
        <div className="card p-5 bg-white border border-slate-200/80 shadow-xs rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Roadmap Details</h2>
          
          <OutlinedInput 
            label="Roadmap Title" 
            required 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="e.g. Data Structures and Algorithms" 
          />
          
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100"
              rows={4}
              placeholder="What will students learn?"
            />
          </label>
        </div>
        
        <div className="card p-5 bg-slate-50 border border-slate-200/80 shadow-xs rounded-xl space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-500 font-medium">
            <span>Sections</span>
            <span className="text-slate-800 font-bold">{sections.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500 font-medium pb-4 border-b border-slate-200">
            <span>Total Items</span>
            <span className="text-slate-800 font-bold">{sections.reduce((acc, s) => acc + s.items.length, 0)}</span>
          </div>
          
          <button type="submit" className="btn-primary w-full py-2.5 text-sm shadow-sm" disabled={busy}>
            {busy ? 'Saving...' : (initialRoadmap ? 'Save Changes' : 'Publish Roadmap')}
          </button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>
      </div>

      {/* RIGHT COLUMN: Sections & Items */}
      <div className="flex-1 w-full space-y-6">
        {sections.map((section, si) => (
          <div key={si} className="card bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-a2sv-200 focus-within:border-a2sv-400">
            {/* Section Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <div className="flex flex-col text-slate-400">
                  <button type="button" onClick={() => moveSection(si, -1)} disabled={si === 0} className="hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 transition">
                    <Icon name="chevronUp" className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1} className="hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-400 transition">
                    <Icon name="chevronDown" className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1">
                  <input
                    required
                    value={section.title}
                    onChange={(e) => updateSectionTitle(si, e.target.value)}
                    placeholder="Section Title (e.g. Arrays & Hashing)"
                    className="w-full bg-transparent text-lg font-bold text-slate-900 outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>
              <button type="button" onClick={() => removeSection(si)} className="text-slate-400 hover:text-red-500 transition p-1" aria-label="Delete Section">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            
            {/* Section Items */}
            <div className="p-5 space-y-3">
              {section.items.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-sm text-slate-400 mb-3">No items in this section yet.</p>
                  <button type="button" onClick={() => addItem(si)} className="btn-secondary py-1.5 px-3 text-sm">
                    + Add First Item
                  </button>
                </div>
              ) : (
                <>
                  {section.items.map((item, ii) => (
                    <div key={ii} className="flex flex-wrap sm:flex-nowrap gap-3 items-center bg-white p-2 rounded-xl border border-slate-200 group hover:border-slate-300 transition">
                      <div className="flex flex-col text-slate-300 pl-1 shrink-0">
                        <button type="button" onClick={() => moveItem(si, ii, -1)} disabled={ii === 0} className="hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300 transition">
                          <Icon name="chevronUp" className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => moveItem(si, ii, 1)} disabled={ii === section.items.length - 1} className="hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300 transition">
                          <Icon name="chevronDown" className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <select
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-a2sv-400 shrink-0 min-w-[110px]"
                        value={item.type}
                        onChange={(e) => updateItem(si, ii, 'type', e.target.value)}
                      >
                        <option value="reading">Reading</option>
                        <option value="video">Video</option>
                        <option value="problem">Problem</option>
                      </select>
                      
                      <div className="flex-1 flex flex-col sm:flex-row gap-2 min-w-[200px]">
                        <input 
                          required 
                          className="w-full sm:w-1/3 h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-a2sv-400 placeholder:text-slate-300 transition" 
                          placeholder="Item Title" 
                          value={item.title} 
                          onChange={(e) => updateItem(si, ii, 'title', e.target.value)} 
                        />
                        <input 
                          required 
                          type="url" 
                          className="w-full sm:flex-1 h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-a2sv-400 placeholder:text-slate-300 transition" 
                          placeholder="https://..." 
                          value={item.link} 
                          onChange={(e) => updateItem(si, ii, 'link', e.target.value)} 
                        />
                      </div>
                      
                      <button type="button" onClick={() => removeItem(si, ii)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition shrink-0" aria-label="Delete Item">
                        <Icon name="x" className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <div className="pt-2">
                    <button type="button" onClick={() => addItem(si)} className="text-a2sv-600 text-sm font-bold hover:text-a2sv-700 transition flex items-center gap-1">
                      <Icon name="plus" className="w-4 h-4" /> Add Item
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        
        <button type="button" onClick={addSection} className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 font-bold hover:border-a2sv-400 hover:text-a2sv-600 transition flex items-center justify-center gap-2 bg-slate-50/50">
          <Icon name="plus" className="w-5 h-5" /> Add New Section
        </button>
      </div>
    </form>
  );
}
