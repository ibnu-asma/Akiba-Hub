import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NAV_SECTIONS } from '@/lib/nav';
import { Icon } from '@/components/icon';

/**
 * Placeholder screens for routes specified in SPEC.md but scheduled for later
 * milestones. Unknown paths 404 so broken links surface immediately.
 */
const SPEC_REFS: Record<string, string> = {
  '/tracks': '§6.2 / §7.5',
  '/exercises': '§7.10-D / §6.4',
  '/problems': '§6.3',
  '/contests': '§6.8 / §7.6',
  '/roadmap': '§6.9 (derived design)',
  '/groups': '§6.10',
  '/forum': '§6.7',
  '/attendance': '§7.4',
  '/problems/new': '§7.5',
  '/tracks/new': '§7.5',
  '/contests/new': '§7.6',
  '/exercises/new': '§7.5',
  '/sessions/new': '§7.3',
  '/daily-problem': '§7.7',
  '/stipends': '§7.8',
  '/summary': '§7.10',
  '/invites': '§8.4',
  '/groups/new': '§8.5',
  '/roles': '§8.6',
  '/super-groups': '§8.3',
  '/activities': '§8.8',
  '/reports': '§8.9',
};

export default async function PlaceholderPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const href = `/${slug.map((part) => decodeURIComponent(part)).join('/')}`;

  const item = NAV_SECTIONS.flatMap((section) => section.items).find((candidate) => candidate.href === href);
  if (!item || !(href in SPEC_REFS)) notFound();

  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-a2sv-50 text-a2sv-600">
        <Icon name={item.icon} className="h-8 w-8" />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{item.label}</h1>
      <p className="mt-2 text-sm text-slate-500">
        Specified in <span className="font-semibold text-slate-700">{SPEC_REFS[href]}</span> of SPEC.md — this screen
        lands in an upcoming milestone of the build order.
      </p>
      <Link href="/dashboard" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
