import { Inject,  Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { tracks, trackProblems, problems, superGroups, and, asc, desc, eq, inArray, isNull, sql } from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';
import { DomainError } from '@hub/shared';

export interface CreateTrackInput {
  superGroupId: string;
  phase: string;
  name: string;
}

export interface ListExercisesOptions {
  q?: string;
  trackId?: string;
  superGroupId?: string;
  limit?: number;
  offset?: number;
}

/** Tracks are the per-SuperGroup curriculum phases (spec §10, §6.2). */
@Injectable()
export class TracksService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider, @Inject(AuditService) private readonly audit: AuditService) {}

  async create(input: CreateTrackInput, actor: { id: string; name: string; role: string }) {
    const sg = await this.db.db
      .select({ id: superGroups.id })
      .from(superGroups)
      .where(eq(superGroups.id, input.superGroupId))
      .execute();
    if (!sg[0]) throw DomainError.validation('Unknown super group');

    try {
      const rows = await this.db.db
        .insert(tracks)
        .values({ superGroupId: input.superGroupId, phase: input.phase, name: input.name })
        .returning()
        .execute();
      const created = rows[0]!;
      await this.audit.record({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'CREATE',
        entityType: 'track',
        entityId: created.id,
        description: `created a track called '${input.name}'`,
      });
      return created;
    } catch (error) {
      // Unique (superGroupId, phase) — one track per phase per SuperGroup.
      // drizzle wraps the driver error in DrizzleQueryError — walk .cause too.
      const dbError = error as { code?: string; cause?: { code?: string } };
      if ((dbError.code ?? dbError.cause?.code) === '23505') {
        throw DomainError.validation('A track for this phase already exists in the selected super group');
      }
      throw error;
    }
  }

  /** All non-deleted tracks with their SuperGroup name + problem count — reads stay open. */
  async list() {
    const rows = await this.db.db
      .select({
        id: tracks.id,
        superGroupId: tracks.superGroupId,
        superGroupName: superGroups.name,
        phase: tracks.phase,
        name: tracks.name,
        sortOrder: tracks.sortOrder,
        createdAt: tracks.createdAt,
      })
      .from(tracks)
      .innerJoin(superGroups, eq(tracks.superGroupId, superGroups.id))
      .where(isNull(tracks.deletedAt))
      .orderBy(asc(superGroups.name), asc(tracks.sortOrder))
      .execute();

    if (rows.length === 0) return rows.map((r) => ({ ...r, problemCount: 0 }));
    const ids = rows.map((r) => r.id);
    const counts = await this.db.db
      .select({ trackId: trackProblems.trackId, count: sql<number>`count(*)::int` })
      .from(trackProblems)
      .where(inArray(trackProblems.trackId, ids))
      .groupBy(trackProblems.trackId)
      .execute();
    const map = new Map(counts.map((r) => [r.trackId, r.count]));
    return rows.map((r) => ({ ...r, problemCount: map.get(r.id) ?? 0 }));
  }

  /** Edit a track's name / phase / super-group (SPEC §7.6). */
  async update(id: string, input: CreateTrackInput, actor: { id: string; name: string; role: string }) {
    const sg = await this.db.db.select({ id: superGroups.id }).from(superGroups).where(eq(superGroups.id, input.superGroupId)).execute();
    if (!sg[0]) throw DomainError.validation('Unknown super group');
    try {
      const rows = await this.db.db
        .update(tracks)
        .set({ superGroupId: input.superGroupId, phase: input.phase, name: input.name })
        .where(and(eq(tracks.id, id), isNull(tracks.deletedAt)))
        .returning()
        .execute();
      if (!rows[0]) throw DomainError.notFound(`Track ${id}`);
      await this.audit.record({
        actorId: actor.id, actorName: actor.name, actorRole: actor.role,
        action: 'UPDATE', entityType: 'track', entityId: id,
        description: `updated the track '${input.name}'`,
      });
      return rows[0];
    } catch (error) {
      const dbError = error as { code?: string; cause?: { code?: string } };
      if ((dbError.code ?? dbError.cause?.code) === '23505') {
        throw DomainError.validation('A track for this phase already exists in the selected super group');
      }
      throw error;
    }
  }

  /** Soft-delete a track (SPEC §7.6 Delete tab). */
  async softDelete(id: string, actor: { id: string; name: string; role: string }) {
    const rows = await this.db.db.update(tracks).set({ deletedAt: new Date() }).where(eq(tracks.id, id)).returning().execute();
    if (!rows[0]) throw DomainError.notFound(`Track ${id}`);
    await this.audit.record({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'DELETE', entityType: 'track', entityId: id,
      description: `deleted the track '${rows[0].name}'`,
    });
  }

  /** Remove one exercise from a track (SPEC §7.6 manage problems). */
  async removeProblem(trackId: string, problemId: string, actor: { id: string; name: string; role: string }) {
    await this.db.db.delete(trackProblems).where(and(eq(trackProblems.trackId, trackId), eq(trackProblems.problemId, problemId))).execute();
    await this.audit.record({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'DELETE', entityType: 'exercise', entityId: trackId,
      description: 'removed an exercise from a track',
    });
    return { ok: true };
  }

  /** Reassign problems from this track to another (SPEC §7.6 bulk utility). */
  async reassign(trackId: string, problemIds: string[], targetTrackId: string, actor: { id: string; name: string; role: string }) {
    if (trackId === targetTrackId) throw DomainError.validation('Pick a different destination track');
    const [source, target] = await Promise.all([
      this.db.db.select({ id: tracks.id, name: tracks.name }).from(tracks).where(eq(tracks.id, trackId)).limit(1).execute(),
      this.db.db.select({ id: tracks.id, name: tracks.name }).from(tracks).where(eq(tracks.id, targetTrackId)).limit(1).execute(),
    ]);
    if (!source[0] || !target[0]) throw DomainError.validation('Unknown track');

    const last = await this.db.db
      .select({ sortOrder: trackProblems.sortOrder })
      .from(trackProblems)
      .where(eq(trackProblems.trackId, targetTrackId))
      .orderBy(desc(trackProblems.sortOrder))
      .limit(1)
      .execute();
    const base = last[0]?.sortOrder ?? -1;

    for (const [index, problemId] of problemIds.entries()) {
      await this.db.db
        .update(trackProblems)
        .set({ trackId: targetTrackId, sortOrder: base + 1 + index })
        .where(and(eq(trackProblems.trackId, trackId), eq(trackProblems.problemId, problemId)))
        .execute();
    }

    await this.audit.record({
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'UPDATE', entityType: 'exercise', entityId: trackId,
      description: `reassigned ${problemIds.length} problem(s) from '${source[0].name}' to '${target[0].name}'`,
    });
    return { moved: problemIds.length };
  }

  /** Attach problems to a track — the "Add exercise" flow (spec §Summary D). */
  async addProblems(trackId: string, problemIds: string[], actor: { id: string; name: string; role: string }) {
    const track = await this.db.db
      .select({ id: tracks.id, name: tracks.name })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .execute();
    if (!track[0]) throw DomainError.validation('Unknown track');

    const known = await this.db.db.select({ id: problems.id }).from(problems).where(inArray(problems.id, problemIds)).execute();
    if (known.length !== problemIds.length) {
      throw DomainError.validation('One or more problems do not exist');
    }

    const existing = await this.db.db
      .select({ problemId: trackProblems.problemId })
      .from(trackProblems)
      .where(eq(trackProblems.trackId, trackId))
      .execute();
    const fresh = problemIds.filter((id) => !existing.some((row) => row.problemId === id));
    if (fresh.length === 0) return { added: 0 };

    const inserted = await this.db.db
      .insert(trackProblems)
      .values(fresh.map((problemId, index) => ({ trackId, problemId, sortOrder: existing.length + index })))
      .returning({ id: trackProblems.id })
      .execute();

    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'exercise',
      entityId: trackId,
      description: `added ${inserted.length} exercises to track '${track[0].name}'`,
    });
    return { added: inserted.length };
  }

  /** Exercises of a track, ordered — powers student Completions (§Summary C). */
  async listProblems(trackId: string) {
    return this.db.db
      .select({
        id: problems.id,
        name: problems.name,
        platform: problems.platform,
        difficulty: problems.difficulty,
        tags: problems.tags,
        link: problems.link,
        sortOrder: trackProblems.sortOrder,
        createdAt: problems.createdAt,
      })
      .from(trackProblems)
      .innerJoin(problems, eq(trackProblems.problemId, problems.id))
      .where(eq(trackProblems.trackId, trackId))
      .orderBy(asc(trackProblems.sortOrder))
      .execute();
  }

  /** Cross-track exercises feed — the "Add exercise" management list (SPEC §7.8). */
  async listExercises(opts: ListExercisesOptions = {}) {
    const conditions = [isNull(tracks.deletedAt)];
    if (opts.q) conditions.push(sql`${problems.name} ilike ${`%${opts.q}%`}`);
    if (opts.trackId) conditions.push(eq(trackProblems.trackId, opts.trackId));
    if (opts.superGroupId) conditions.push(eq(tracks.superGroupId, opts.superGroupId));
    const where = and(...conditions);

    const select = {
      id: trackProblems.id,
      problemId: trackProblems.problemId,
      problemName: problems.name,
      difficulty: problems.difficulty,
      platform: problems.platform,
      tags: problems.tags,
      link: problems.link,
      trackId: tracks.id,
      trackName: tracks.name,
      phase: tracks.phase,
      superGroupId: tracks.superGroupId,
      superGroupName: superGroups.name,
      sortOrder: trackProblems.sortOrder,
      createdAt: problems.createdAt,
    };

    const join = (q: ReturnType<typeof this.db.db.select>) => q.from(trackProblems).innerJoin(tracks, eq(trackProblems.trackId, tracks.id)).innerJoin(superGroups, eq(tracks.superGroupId, superGroups.id)).innerJoin(problems, eq(trackProblems.problemId, problems.id)).where(where);

    if (opts.limit !== undefined) {
      const [rows, totalRows] = await Promise.all([
        join(this.db.db.select(select)).orderBy(desc(problems.createdAt), asc(trackProblems.sortOrder)).limit(opts.limit).offset(opts.offset ?? 0).execute(),
        join(this.db.db.select({ count: sql<number>`count(*)::int` })).execute(),
      ]);
      return { rows, total: totalRows[0]?.count ?? 0 };
    }

    const rows = await join(this.db.db.select(select)).orderBy(desc(problems.createdAt), asc(trackProblems.sortOrder)).limit(500).execute();
    return rows;
  }
}