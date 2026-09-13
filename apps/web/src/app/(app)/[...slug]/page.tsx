import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NAV_SECTIONS } from '@/lib/nav';
import { Icon } from '@/components/icon';

/**
 * Catch-all for unknown in-app routes — everything in the student sidebar is a
 * real page now, so any hit here means a broken link: 404 immediately.
 */
export default async function PlaceholderPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const href = `/${slug.map((part) => decodeURIComponent(part)).join('/')}`;

  const item = NAV_SECTIONS.flatMap((section) => section.items).find((candidate) => candidate.href === href);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-a2sv-50 text-a2sv-600">
        <Icon name={item.icon} className="h-8 w-8" />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{item.label}</h1>
      <p className="mt-2 text-sm text-slate-500">
        This page lives at <span className="font-semibold text-slate-700">{href}</span> but hasn&apos;t been built yet.
      </p>
      <Link href="/dashboard" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
