import { Inject,  Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { desc, eq, funds, sql, stipends, users } from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';
import { DomainError } from '@hub/shared';

export interface CreateFundInput {
  name: string;
  description?: string | null;
  amount: number;
  currency?: string;
}

export interface AssignStipendsInput {
  month: string; // "2024-10"
  rows: { userId: string; amount: number }[];
}

/**
 * Stipends & Funds (SPEC §7.8) — in-person heads of education manage payouts.
 * A fund is a named budget; stipends are per-student monthly amounts drawn
 * from it. Every endpoint is gated to HoE/HoA at the controller.
 */
@Injectable()
export class FundsService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider, @Inject(AuditService) private readonly audit: AuditService) {}

  async create(input: CreateFundInput, actor: { id: string; name: string; role: string }) {
    const rows = await this.db.db
      .insert(funds)
      .values({
        name: input.name,
        description: input.description ?? null,
        amount: input.amount,
        currency: input.currency ?? 'ETB',
        createdBy: actor.id,
      })
      .returning()
      .execute();
    const created = rows[0]!;

    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'fund',
      entityId: created.id,
      description: `created the fund called '${input.name}'`,
    });
    return created;
  }

  /** Funds newest-first with paid/pending roll-ups for the manager cards. */
  async list() {
    const rows = await this.db.db.select().from(funds).orderBy(desc(funds.createdAt)).limit(100).execute();
    const totals = await this.db.db
      .select({
        fundId: stipends.fundId,
        status: stipends.status,
        total: sql<number>`sum(${stipends.amount})`,
      })
      .from(stipends)
      .groupBy(stipends.fundId, stipends.status)
      .execute();

    return rows.map((fund) => ({
      ...fund,
      paidTotal: totals.find((t) => t.fundId === fund.id && t.status === 'paid')?.total ?? 0,
      pendingTotal: totals.find((t) => t.fundId === fund.id && t.status === 'pending')?.total ?? 0,
    }));
  }

  /** Stipends of one fund, joined with the student's name. */
  async listStipends(fundId: string) {
    return this.db.db
      .select({
        id: stipends.id,
        userId: stipends.userId,
        userName: users.name,
        month: stipends.month,
        amount: stipends.amount,
        mode: stipends.mode,
        status: stipends.status,
        createdAt: stipends.createdAt,
      })
      .from(stipends)
      .leftJoin(users, eq(stipends.userId, users.id))
      .where(eq(stipends.fundId, fundId))
      .orderBy(desc(stipends.createdAt))
      .limit(200)
      .execute();
  }

  /**
   * Batch-assign monthly stipends. Unique (fund, user, month) — re-assigning
   * updates the amount instead of erroring, so corrections are idempotent.
   */
  async assignStipends(fundId: string, input: AssignStipendsInput, actor: { id: string; name: string; role: string }) {
    const fundRows = await this.db.db.select().from(funds).where(eq(funds.id, fundId)).limit(1).execute();
    const fund = fundRows[0];
    if (!fund) throw DomainError.validation('Unknown fund');

    for (const row of input.rows) {
      await this.db.db
        .insert(stipends)
        .values({
          fundId,
          userId: row.userId,
          month: input.month,
          amount: row.amount,
          mode: 'manual',
          status: 'pending',
        })
        .onConflictDoUpdate({
          target: [stipends.fundId, stipends.userId, stipends.month],
          set: { amount: row.amount },
        })
        .execute();
    }

    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'stipend',
      entityId: fundId,
      description: `assigned ${input.rows.length} stipends from the fund called '${fund.name}' for ${input.month}`,
    });
    return { fundId, month: input.month, assigned: input.rows.length };
  }

  /** Mark a stipend paid (or back to pending) — audit notes the student + fund. */
  async markStipend(id: string, status: string, actor: { id: string; name: string; role: string }) {
    const rows = await this.db.db
      .select({ id: stipends.id, fundName: funds.name, userName: users.name })
      .from(stipends)
      .leftJoin(funds, eq(stipends.fundId, funds.id))
      .leftJoin(users, eq(stipends.userId, users.id))
      .where(eq(stipends.id, id))
      .limit(1)
      .execute();
    const row = rows[0];
    if (!row) throw DomainError.validation('Unknown stipend');

    await this.db.db.update(stipends).set({ status }).where(eq(stipends.id, id)).execute();
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'UPDATE',
      entityType: 'stipend',
      entityId: id,
      description: `marked ${row.userName ?? 'a student'}'s stipend from '${row.fundName ?? 'a fund'}' as ${status}`,
    });
    return { id, status };
  }
}