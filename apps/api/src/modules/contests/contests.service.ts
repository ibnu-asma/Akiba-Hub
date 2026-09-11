import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { contestGroups, contestProblems, contests, desc, eq } from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';

export interface CreateContestInput {
  name: string;
  number?: number | null;
  type: string;
  unrated: boolean;
  date: string;
  standingsLink?: string | null;
  groupIds: string[];
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Contests — HoE/HoA schedule + attach questions, every role reads (spec §6.8 / §7.6). */
@Injectable()
export class ContestsService {
  constructor(private readonly db: DatabaseProvider, private readonly audit: AuditService) {}

  async create(input: CreateContestInput, actor: { id: string; name: string; role: string }) {
    const rows = await this.db.db
      .insert(contests)
      .values({
        name: input.name,
        number: input.number ?? null,
        type: input.type,
        unrated: input.unrated,
        date: new Date(input.date),
        standingsLink: input.standingsLink ?? null,
        createdBy: actor.id,
      })
      .returning()
      .execute();
    const created = rows[0]!;

    if (input.groupIds.length > 0) {
      await this.db.db
        .insert(contestGroups)
        .values(input.groupIds.map((groupId) => ({ contestId: created.id, groupId })))
        .onConflictDoNothing()
        .execute();
    }

    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'contest',
      entityId: created.id,
      description: `created the contest called '${input.name}'`,
    });
    return created;
  }

  /**
   * Attach questions to a contest — each gets the next free pseudo letter
   * (A, B, C…). Duplicates (same problem twice) are skipped silently.
   */
  async attachProblems(
    contestId: string,
    contestName: string,
    problemIds: string[],
    actor: { id: string; name: string; role: string },
  ) {
    const unique = [...new Set(problemIds)];
    const existing = await this.db.db
      .select({ problemId: contestProblems.problemId })
      .from(contestProblems)
      .where(eq(contestProblems.contestId, contestId))
      .execute();
    const alreadyIn = new Set(existing.map((row) => row.problemId));
    const pending = unique.filter((problemId) => !alreadyIn.has(problemId));

    // Assign letters after the highest used one (gaps are tolerated).
    const used = existing.length;
    if (pending.length > 0) {
      await this.db.db
        .insert(contestProblems)
        .values(
          pending.map((problemId, index) => ({
            contestId,
            pseudo: LETTERS[(used + index) % 26]!,
            problemId,
          })),
        )
        .onConflictDoNothing()
        .execute();
    }

    if (pending.length > 0) {
      await this.audit.record({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'UPDATE',
        entityType: 'contest',
        entityId: contestId,
        description: `attached ${pending.length} exercises to contest '${contestName}'`,
      });
    }
    return { added: pending.length };
  }

  /** Newest-first by scheduled date — powers dashboard contest accordions (§6.8). */
  async list(limit = 50) {
    return this.db.db
      .select()
      .from(contests)
      .orderBy(desc(contests.date))
      .limit(Math.min(Math.max(limit, 1), 200))
      .execute();
  }
}
