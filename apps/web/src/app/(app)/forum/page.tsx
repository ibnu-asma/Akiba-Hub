import { redirect } from 'next/navigation';
import { getMe, hubFetch, safe, type PostDto } from '@/lib/api';
import { ForumBoard } from '@/components/forum/forum-board';

/** Forum (SPEC §6.7) — academy-wide discussion, any authenticated user. */
export default async function ForumPage() {
  const me = await getMe();
  if (!me) redirect('/login');

  const posts = (await safe(hubFetch<PostDto[]>('/posts?sort=latest'))) ?? [];

  return <ForumBoard initialPosts={posts} me={me} />;
}
