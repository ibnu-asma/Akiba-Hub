import { Inject, Injectable } from "@nestjs/common";
import { DatabaseProvider } from "../../config/database.provider.js";
import { problems, and, desc, eq, isNull, or, sql } from "@hub/database";
import { AuditService } from "../../common/audit/audit.service.js";
import { DomainError } from "@hub/shared";

export interface CreateProblemInput {
  name: string;
  platform: string;
  difficulty: string;
  tags: string[];
  link: string;
}

export interface ListProblemOptions {
  q?: string;
  difficulty?: string;
  tag?: string;
  link?: string;
  limit?: number;
  offset?: number;
}

/** Problems library — HoE/HoA curate, every role reads (spec §6.3 / §7.5). */
@Injectable()
export class ProblemsService {
  constructor(
    @Inject(DatabaseProvider) private readonly db: DatabaseProvider,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async create(
    input: CreateProblemInput,
    actor: { id: string; name: string; role: string },
  ) {
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
      action: "CREATE",
      entityType: "problem",
      entityId: created.id,
      description: `added a problem called '${input.name}'`,
    });
    return created;
  }

  /** Library feed — newest-first, with optional search/difficulty/tag filters + pagination. */
  async list(opts?: ListProblemOptions) {
    const conditions: ReturnType<typeof sql>[] = [isNull(problems.deletedAt)];
    if (opts?.difficulty)
      conditions.push(eq(problems.difficulty, opts.difficulty));
    if (opts?.tag)
      conditions.push(
        sql`${problems.tags} @> ${JSON.stringify([opts.tag])}::jsonb`,
      );
    if (opts?.q)
      conditions.push(
        sql`lower(${problems.name}) like ${`%${opts.q.toLowerCase()}%`}`,
      );
    if (opts?.link) {
      const raw = opts.link.trim();
      const { regexPattern } = normalizeProblemUrl(raw);
      conditions.push(
        or(
          eq(problems.link, raw),
          sql`${problems.link} ~* ${regexPattern}`,
        )!,
      );
    }
    const where = and(...conditions);
    const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 200);

    if (opts?.offset != null) {
      const [rows, countRows] = await Promise.all([
        this.db.db
          .select()
          .from(problems)
          .where(where)
          .orderBy(desc(problems.createdAt))
          .limit(limit)
          .offset(opts.offset)
          .execute(),
        this.db.db
          .select({ count: sql<number>`count(*)::int` })
          .from(problems)
          .where(where)
          .execute(),
      ]);
      return { rows, total: countRows[0]?.count ?? 0 };
    }

    return this.db.db
      .select()
      .from(problems)
      .where(where)
      .orderBy(desc(problems.createdAt))
      .limit(limit)
      .execute();
  }

  /** Edit a problem's fields (SPEC §7.5). */
  async update(
    id: string,
    input: CreateProblemInput,
    actor: { id: string; name: string; role: string },
  ) {
    const rows = await this.db.db
      .update(problems)
      .set({
        name: input.name,
        platform: input.platform,
        difficulty: input.difficulty,
        tags: input.tags,
        link: input.link,
      })
      .where(and(eq(problems.id, id), isNull(problems.deletedAt)))
      .returning()
      .execute();
    if (!rows[0]) throw DomainError.notFound(`Problem ${id}`);
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "UPDATE",
      entityType: "problem",
      entityId: id,
      description: `updated the problem '${input.name}'`,
    });
    return rows[0];
  }

  /** Soft-delete a problem (SPEC §7.5 trash icon). */
  async softDelete(
    id: string,
    actor: { id: string; name: string; role: string },
  ) {
    const rows = await this.db.db
      .update(problems)
      .set({ deletedAt: new Date() })
      .where(eq(problems.id, id))
      .returning()
      .execute();
    if (!rows[0]) throw DomainError.notFound(`Problem ${id}`);
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "DELETE",
      entityType: "problem",
      entityId: id,
      description: `deleted the problem '${rows[0].name}'`,
    });
  }

  async findOne(id: string) {
    const row = await this.db.db
      .select()
      .from(problems)
      .where(and(eq(problems.id, id), isNull(problems.deletedAt)))
      .execute();
    if (!row.length) throw DomainError.notFound("Problem not found");
    return row[0];
  }
}

/**
 * Normalizes a problem URL for consistent matching:
 * - Lowercases hostname and path
 * - Strips protocol (http/https) and www.
 * - Strips query parameters (?...) and hash fragments (#...)
 * - Strips trailing LeetCode '/description' path
 * - Strips trailing slashes
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes a problem URL for consistent matching:
 * - Lowercases hostname and path
 * - Strips protocol (http/https) and www.
 * - Extracts canonical problem slug:
 *     - LeetCode: /problems/<slug> (handles /submissions/..., /description, /solutions, etc.)
 *     - HackerRank: /challenges/<slug>
 *     - Codeforces: /contest/<id>/problem/<idx> or /problemset/problem/<id>/<idx>
 * - Strips query parameters (?...) and hash fragments (#...)
 * - Strips trailing slashes
 */
function normalizeProblemUrl(rawUrl: string): { normalized: string; regexPattern: string } {
  try {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    const parsed = new URL(url);
    const host = parsed.host.replace(/^www\./i, '').toLowerCase();
    const pathname = parsed.pathname.toLowerCase().replace(/\/+$/, '');

    // LeetCode: canonicalize to leetcode.com/problems/<slug>
    if (host.includes('leetcode.com')) {
      const match = pathname.match(/^\/problems\/([^/]+)/);
      if (match) {
        const canonical = `leetcode.com/problems/${match[1]}`;
        return {
          normalized: canonical,
          regexPattern: `^https?://(www\\.)?${escapeRegex(canonical)}(/|\\?|#|$)`,
        };
      }
    }

    // Codeforces: canonicalize contest vs problemset
    if (host.includes('codeforces.com')) {
      const match = pathname.match(/^\/(?:contest|problemset)\/(?:problem\/)?([0-9]+)\/(?:problem\/)?([a-z0-9]+)/i);
      if (match) {
        const contestId = match[1];
        const index = match[2].toLowerCase();
        const canonical = `codeforces.com/contest/${contestId}/problem/${index}`;
        return {
          normalized: canonical,
          regexPattern: `^https?://(www\\.)?codeforces\\.com/(contest/${contestId}/problem|problemset/problem/${contestId})/${index}(/|\\?|#|$)`,
        };
      }
    }

    // HackerRank: canonicalize to hackerrank.com/challenges/<slug>
    if (host.includes('hackerrank.com')) {
      const match = pathname.match(/^\/challenges\/([^/]+)/);
      if (match) {
        const canonical = `hackerrank.com/challenges/${match[1]}`;
        return {
          normalized: canonical,
          regexPattern: `^https?://(www\\.)?${escapeRegex(canonical)}(/|\\?|#|$)`,
        };
      }
    }

    // General fallback
    const cleanPath = pathname.replace(/\/description\/?$/i, '').replace(/\/+$/, '');
    const canonical = `${host}${cleanPath}`;
    return {
      normalized: canonical,
      regexPattern: `^https?://(www\\.)?${escapeRegex(canonical)}(/|\\?|#|$)`,
    };
  } catch {
    const fallback = rawUrl.trim().toLowerCase().replace(/\/+$/, '');
    return {
      normalized: fallback,
      regexPattern: `^https?://(www\\.)?${escapeRegex(fallback)}(/|\\?|#|$)`,
    };
  }
}
