import { Inject,  Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { and, comments, eq, inArray, posts, postVotes, sql, users } from '@hub/database';
import { DomainError } from '@hub/shared';

export interface CreatePostInput {
  title: string;
  body: string;
}

/**
 * Forum (SPEC §6.7) — academy-wide discussion. Any authenticated user reads,
 * posts, votes, and comments. Score is the net of up/down votes.
 */
@Injectable()
export class ForumService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider) {}

  async list(sort = 'latest', limit = 100, actorId?: string) {
    const orderClause =
      sort === 'top'
        ? sql`(${posts.votesUp} - ${posts.votesDown}) desc`
        : sort === 'oldest'
          ? sql`${posts.createdAt} asc`
          : sql`${posts.createdAt} desc`;

    const rows = await this.db.db
      .select({
        id: posts.id,
        userId: posts.userId,
        userName: users.name,
        userAvatar: users.avatarUrl,
        userRole: users.role,
        title: posts.title,
        body: posts.body,
        votesUp: posts.votesUp,
        votesDown: posts.votesDown,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .orderBy(orderClause)
      .limit(Math.min(Math.max(limit, 1), 200))
      .execute();

    // comment counts via a grouped post-query + user votes
    let commentCounts = new Map<string, number>();
    let myVotes = new Map<string, number>();
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const [counts, votes] = await Promise.all([
        this.db.db
          .select({ postId: comments.postId, count: sql<number>`count(*)::int` })
          .from(comments)
          .where(inArray(comments.postId, ids))
          .groupBy(comments.postId)
          .execute(),
        actorId
          ? this.db.db
              .select({ postId: postVotes.postId, value: postVotes.value })
              .from(postVotes)
              .where(and(inArray(postVotes.postId, ids), eq(postVotes.userId, actorId)))
              .execute()
          : Promise.resolve([]),
      ]);
      commentCounts = new Map(counts.map((r) => [r.postId, r.count]));
      myVotes = new Map(votes.map((v) => [v.postId, v.value]));
    }

    return rows.map((r) => ({
      ...r,
      score: r.votesUp - r.votesDown,
      commentCount: commentCounts.get(r.id) ?? 0,
      myVote: myVotes.get(r.id) ?? 0,
    }));
  }

  async create(input: CreatePostInput, actor: { id: string }) {
    const rows = await this.db.db
      .insert(posts)
      .values({ userId: actor.id, title: input.title, body: input.body })
      .returning()
      .execute();
    return rows[0]!;
  }

  /** Toggle/apply an up (+1) or down (-1) vote, updating the denormalized counters. */
  async vote(postId: string, actorId: string, value: number) {
    const post = await this.db.db.select().from(posts).where(eq(posts.id, postId)).limit(1).execute();
    if (!post[0]) throw DomainError.notFound(`Post ${postId}`);

    const existing = await this.db.db
      .select()
      .from(postVotes)
      .where(and(eq(postVotes.postId, postId), eq(postVotes.userId, actorId)))
      .limit(1)
      .execute();

    if (!existing[0]) {
      await this.db.db.insert(postVotes).values({ postId, userId: actorId, value }).execute();
      await this.db.db
        .update(posts)
        .set(value === 1 ? { votesUp: sql`${posts.votesUp} + 1` } : { votesDown: sql`${posts.votesDown} + 1` })
        .where(eq(posts.id, postId))
        .execute();
    } else if (existing[0].value === value) {
      await this.db.db.delete(postVotes).where(and(eq(postVotes.postId, postId), eq(postVotes.userId, actorId))).execute();
      await this.db.db
        .update(posts)
        .set(value === 1 ? { votesUp: sql`${posts.votesUp} - 1` } : { votesDown: sql`${posts.votesDown} - 1` })
        .where(eq(posts.id, postId))
        .execute();
    } else {
      await this.db.db.update(postVotes).set({ value }).where(and(eq(postVotes.postId, postId), eq(postVotes.userId, actorId))).execute();
      await this.db.db
        .update(posts)
        .set({
          votesUp: sql`${posts.votesUp} + ${value === 1 ? 1 : -1}`,
          votesDown: sql`${posts.votesDown} + ${value === -1 ? 1 : -1}`,
        })
        .where(eq(posts.id, postId))
        .execute();
    }
    return { ok: true };
  }

  async listComments(postId: string) {
    return this.db.db
      .select({
        id: comments.id,
        userId: comments.userId,
        userName: users.name,
        userAvatar: users.avatarUrl,
        userRole: users.role,
        body: comments.body,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt)
      .execute();
  }

  async addComment(postId: string, body: string, actor: { id: string }) {
    const post = await this.db.db.select({ id: posts.id }).from(posts).where(eq(posts.id, postId)).limit(1).execute();
    if (!post[0]) throw DomainError.notFound(`Post ${postId}`);
    const rows = await this.db.db.insert(comments).values({ postId, userId: actor.id, body }).returning().execute();
    return rows[0]!;
  }
}
