import { redirect } from 'next/navigation';
import { ROLE_NAMES } from '@hub/shared';
import { getMe, hubFetch, safe, type Group } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/** Profile — view account overview for current user or teammate (SPEC §6.6). */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ userId?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect('/login');

  const groups = (await safe(hubFetch<Group[]>('/groups'))) ?? [];
  const { userId } = (await searchParams) ?? {};

  let targetUser = me;
  let userGroup = groups.find((g) => g.id === me.groupId) ?? null;
  let isViewingSelf = true;

  if (userId && userId !== me.id) {
    for (const g of groups) {
      const found = g.students.find((s) => s.id === userId);
      if (found) {
        targetUser = {
          ...me,
          id: found.id,
          name: found.name,
          email: `${found.name.toLowerCase().replace(/\s+/g, '.')}@akibatech.com`,
          avatarUrl: found.avatarUrl,
          groupId: g.id,
          role: 'student',
        };
        userGroup = g;
        isViewingSelf = false;
        break;
      }
    }
  }

  const roleLabel = ROLE_NAMES[targetUser.role as keyof typeof ROLE_NAMES] ?? targetUser.role;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isViewingSelf ? 'Profile' : `${targetUser.name}'s Profile`}
        </h1>
      </header>

      <section className="card p-6 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-a2sv-100 text-xl font-bold text-a2sv-700">
          {targetUser.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={targetUser.avatarUrl} alt={targetUser.name} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            initials(targetUser.name)
          )}
        </span>
        <h2 className="mt-3 text-xl font-bold text-slate-900">{targetUser.name}</h2>
        <p className="mt-1 text-sm text-slate-500">{targetUser.email}</p>
        <span className="chip mt-3 bg-a2sv-500 text-white">{roleLabel}</span>
      </section>

      <section className="card p-6">
        <dl className="divide-y divide-slate-100">
          <Detail label="Rating" value={String(targetUser.rating ?? 1200)} />
          <Detail label="Group" value={userGroup?.name ?? 'Not assigned'} />
          <Detail label="Program" value={userGroup?.superGroupName ?? '—'} />
          <Detail label="Country" value={targetUser.country ?? '—'} />
          <Detail label="University" value={targetUser.university ?? '—'} />
        </dl>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}