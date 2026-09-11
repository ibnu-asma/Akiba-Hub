import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { problems, desc } from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';

export interface CreateProblemInput {
  name: string;
  platform: string;
  difficulty: string;
  tags: string[];
  link: string;
}

/** Problems library — HoE/HoA curate, every role reads (spec §6.3 / §7.5). */
@Injectable()
export class ProblemsService {
  constructor(private readonly db: DatabaseProvider, private readonly audit: AuditService) {}

  async create(input: CreateProblemInput, actor: { id: string; name: string; role: string }) {
    const rows = await this.db.db
      .insert(problems)
      .values({
        name: input.name,
        platform: input.platform,
        difficulty: input.difficulty,
        tags: input.tags,
        link: input.link,
        addedBy: actor.id,
      })
      .returning()
      .execute();
    const created = rows[0]!;
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'problem',
      entityId: created.id,
      description: `added a problem called '${input.name}'`,
    });
    return created;
  }

  /** Newest-first library feed — powers dashboard "Latest Problems" (§6.x). */
  async list(limit = 100) {
    return this.db.db
      .select()
      .from(problems)
      .orderBy(desc(problems.createdAt))
      .limit(Math.min(Math.max(limit, 1), 200))
      .execute();
  }
}