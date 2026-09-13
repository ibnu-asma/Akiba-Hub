import { redirect } from 'next/navigation';
import { getMe, hubFetch, safe, type PostDto } from '@/lib/api';
import { ForumBoard } from '@/components/forum/forum-board';

/** Forum (SPEC §6.7) — academy-wide discussion, any authenticated user. */
export default async function ForumPage() {
  const me = await getMe();
  if (!me) redirect('/login');

  const posts = (await safe(hubFetch<PostDto[]>('/posts?sort=latest'))) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Forum</h1>
        <p className="mt-1 text-sm text-slate-500">Discussion forum for the whole academy.</p>
      </header>
      <ForumBoard initialPosts={posts} />
    </div>
  );
  return <ForumBoard initialPosts={posts} me={me} />;
}
