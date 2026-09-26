'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedInput } from '@/components/form/field';
import { Icon } from '@/components/icon';

type Item = { type: 'video' | 'reading' | 'problem'; title: string; link: string };
type Section = { title: string; items: Item[] };

export function CreateRoadmapForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<Section[]>([{ title: '', items: [] }]);
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
    // @ts-ignore
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, sections }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error?.message ?? 'Failed to create roadmap');
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Roadmap Info</h2>
        <OutlinedInput label="Roadmap Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Structures and Algorithms" />
        <label className="block text-sm font-medium text-slate-700">
          Description (Optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100"
            rows={3}
          />
        </label>
      </div>

      <div className="space-y-4">
        {sections.map((section, si) => (
          <div key={si} className="card p-6 border-l-4 border-l-a2sv-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-bold text-slate-900">Section {si + 1}</h3>
              <button type="button" onClick={() => removeSection(si)} className="text-red-500 text-sm hover:underline">Remove Section</button>
            </div>
            
            <OutlinedInput label="Section Title" required value={section.title} onChange={(e) => updateSectionTitle(si, e.target.value)} placeholder="e.g. Sorting Algorithms" />
            
            <div className="mt-4 space-y-3">
              {section.items.map((item, ii) => (
                <div key={ii} className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <select
                    className="h-[38px] rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none"
                    value={item.type}
                    onChange={(e) => updateItem(si, ii, 'type', e.target.value)}
                  >
                    <option value="reading">Reading</option>
                    <option value="video">Video</option>
                    <option value="problem">Problem</option>
                  </select>
                  <div className="flex-1 space-y-2">
                    <input required className="w-full h-[38px] rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Item Title" value={item.title} onChange={(e) => updateItem(si, ii, 'title', e.target.value)} />
                    <input required type="url" className="w-full h-[38px] rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Link URL" value={item.link} onChange={(e) => updateItem(si, ii, 'link', e.target.value)} />
                  </div>
                  <button type="button" onClick={() => removeItem(si, ii)} className="p-2 text-slate-400 hover:text-red-500">
                    <Icon name="x" className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addItem(si)} className="text-a2sv-600 text-sm font-medium hover:underline">+ Add Item</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <button type="button" onClick={addSection} className="btn-secondary">+ Add Section</button>
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Create Roadmap'}</button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}
