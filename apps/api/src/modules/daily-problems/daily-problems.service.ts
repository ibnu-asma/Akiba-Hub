import { Inject,  Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { dailyProblems, desc, eq, problems } from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';
import { DomainError } from '@hub/shared';

export interface CreateDailyProblemInput {
  superGroupId: string;
  problemId: string;
  date: string;
}

/** Daily problems — the 24-hour challenge queue (spec §6.5 / §7.7). */
@Injectable()
export class DailyProblemsService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider, @Inject(AuditService) private readonly audit: AuditService) {}

  async create(input: CreateDailyProblemInput, actor: { id: string; name: string; role: string }) {
    try {
      const rows = await this.db.db
        .insert(dailyProblems)
        .values({
          superGroupId: input.superGroupId,
          problemId: input.problemId,
          date: input.date,
        })
        .returning()
        .execute();
      const created = rows[0]!;

      await this.audit.record({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'CREATE',
        entityType: 'daily-problem',
        entityId: created.id,
        description: `assigned a daily problem for ${input.date}`,
      });
      return created;
    } catch (error) {
      // One daily problem per super group per day (daily_problems_sg_date_idx).
      // drizzle wraps the driver error in DrizzleQueryError — walk .cause too.
      const dbError = error as { code?: string; cause?: { code?: string } };
      if ((dbError.code ?? dbError.cause?.code) === '23505') {
        throw DomainError.validation('A daily problem is already assigned for that date in this super group');
      }
      throw error;
    }
  }

  /** Newest-first with the joined problem for the manager list + student card. */
  async list(limit = 30) {
    return this.db.db
      .select({
        id: dailyProblems.id,
        superGroupId: dailyProblems.superGroupId,
        problemId: dailyProblems.problemId,
        date: dailyProblems.date,
        active: dailyProblems.active,
        problemName: problems.name,
        platform: problems.platform,
        difficulty: problems.difficulty,
        link: problems.link,
      })
      .from(dailyProblems)
      .innerJoin(problems, eq(dailyProblems.problemId, problems.id))
      .orderBy(desc(dailyProblems.date))
      .limit(Math.min(Math.max(limit, 1), 100))
      .execute();
  }
}