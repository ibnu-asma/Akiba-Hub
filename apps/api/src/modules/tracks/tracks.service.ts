import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { tracks, trackProblems, problems, superGroups, asc, eq, inArray } from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';
import { DomainError } from '@hub/shared';

export interface CreateTrackInput {
  superGroupId: string;
  phase: string;
  name: string;
}

/** Tracks are the per-SuperGroup curriculum phases (spec §10, §6.2). */
@Injectable()
export class TracksService {
  constructor(private readonly db: DatabaseProvider, private readonly audit: AuditService) {}

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

  /** All tracks with their SuperGroup name — reads stay open, scopes gate writes. */
  async list() {
    return this.db.db
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
      .orderBy(asc(superGroups.name), asc(tracks.sortOrder))
      .execute();
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
      })
      .from(trackProblems)
      .innerJoin(problems, eq(trackProblems.problemId, problems.id))
      .where(eq(trackProblems.trackId, trackId))
      .orderBy(asc(trackProblems.sortOrder))
      .execute();
  }
}