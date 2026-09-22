import { Inject,  Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseProvider } from '../../config/database.provider.js';
import { and, desc, eq, invitations, sql, users } from '@hub/database';
import { env } from '../../config/env.js';
import { hashToken } from '../auth/auth.service.js';
import { AuditService } from '../../common/audit/audit.service.js';
import { MailerService } from '../../common/mailer/mailer.service.js';
import { DomainError } from '@hub/shared';

export interface MassInviteeInput {
  firstName: string;
  lastName: string;
  personalEmail: string;
}

export interface InvitationResult {
  id: string;
  token: string; // plaintext once, then only the hash is stored
  orgEmail: string | null;
  personalEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

/**
 * Invitation use-cases — the ONLY entry to the Hub (HoA; spec §8.5).
 * mass = true  → one invite per email (bulk "Register Invite" link)
 * mass = false → "take-over" an existing user and re-assign role
 */
@Injectable()
export class InvitationsService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider, @Inject(AuditService) private readonly audit: AuditService, @Inject(MailerService) private readonly mailer: MailerService, ) {}

  async generateMass(invitees: MassInviteeInput[], role: string, actor: { id: string; name: string }): Promise<InvitationResult[]> {
    const ttlMs = durationToMs(env.INVITE_EXPIRES);
    const out: InvitationResult[] = [];

    for (const invitee of invitees) {
      const orgEmail = await this.uniqueOrgEmail(invitee.firstName, invitee.lastName);
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + ttlMs);
      const inviteUrl = `${env.WEB_ORIGIN}/register-invite?token=${token}&email=${encodeURIComponent(orgEmail)}`;

      const inserted = await this.db.db
        .insert(invitations)
        .values({
          email: orgEmail,
          firstName: invitee.firstName,
          lastName: invitee.lastName,
          personalEmail: invitee.personalEmail,
          role,
          mass: true,
          tokenHash: hashToken(token),
          expiresAt,
          createdBy: actor.id,
        })
        .returning({ id: invitations.id })
        .execute();

      await this.mailer.sendInvite(invitee.personalEmail, { firstName: invitee.firstName, orgEmail, inviteUrl });

      out.push({
        id: inserted[0]!.id,
        token,
        orgEmail,
        personalEmail: invitee.personalEmail,
        firstName: invitee.firstName,
        lastName: invitee.lastName,
        role,
        inviteUrl,
        expiresAt,
      });
    }

    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: 'head_of_academy',
      action: 'CREATE',
      entityType: 'invitation',
      description: `sent ${invitees.length} invitation(s) with role ${role}`,
    });
    return out;
  }

  /** Re-issue a fresh token + extend expiry, and re-send the invite email. */
  async resend(id: string): Promise<{ id: string; inviteUrl: string }> {
    const existing = await this.db.db.select().from(invitations).where(eq(invitations.id, id)).limit(1).execute();
    const invite = existing[0];
    if (!invite) throw DomainError.notFound('Invitation not found');
    if (invite.usedAt) throw DomainError.conflict('Invitation already used');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + durationToMs(env.INVITE_EXPIRES));
    const inviteUrl = `${env.WEB_ORIGIN}/register-invite?token=${token}&email=${encodeURIComponent(invite.email ?? '')}`;
    await this.db.db
      .update(invitations)
      .set({ tokenHash: hashToken(token), expiresAt, revokedAt: null })
      .where(eq(invitations.id, id))
      .execute();
    if (invite.personalEmail && invite.firstName && invite.email) {
      await this.mailer.sendInvite(invite.personalEmail, { firstName: invite.firstName, orgEmail: invite.email, inviteUrl });
    }
    return { id, inviteUrl };
  }

  /** Cancel an unused invite (SPEC §8.5 lifecycle). */
  async revoke(id: string): Promise<{ id: string; revoked: boolean }> {
    const existing = await this.db.db.select().from(invitations).where(eq(invitations.id, id)).limit(1).execute();
    const invite = existing[0];
    if (!invite) throw DomainError.notFound('Invitation not found');
    if (invite.usedAt) throw DomainError.conflict('Invitation already used');
    await this.db.db.update(invitations).set({ revokedAt: new Date() }).where(eq(invitations.id, id)).execute();
    return { id, revoked: true };
  }

  async generateTakeOver(userId: string, role: string, actor: { id: string; name: string }): Promise<InvitationResult> {
    const existing = await this.db.db.select().from(invitations).where(eq(invitations.takeOverUserId, userId)).execute();
    if (existing[0]) throw DomainError.conflict('This user already has an active take-over invite');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + durationToMs(env.INVITE_EXPIRES));
    const inserted = await this.db.db
      .insert(invitations)
      .values({
        role,
        mass: false,
        takeOverUserId: userId,
        tokenHash: hashToken(token),
        expiresAt,
        createdBy: actor.id,
      })
      .returning({ id: invitations.id })
      .execute();
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: 'head_of_academy',
      action: 'CREATE',
      entityType: 'invitation',
      description: `issued a take-over invite for user ${userId} with role ${role}`,
    });
    const inviteUrl = `${env.WEB_ORIGIN}/register-invite?token=${token}`;
    return { id: inserted[0]!.id, token, orgEmail: null, personalEmail: null, firstName: null, lastName: null, role, inviteUrl, expiresAt };
  }

  async list(opts: InvitationListOptions): Promise<{ rows: BoundInvitation[]; total: number }> {
    const conditions: ReturnType<typeof sql>[] = [];
    if (opts.status === 'used') conditions.push(sql`${invitations.usedAt} is not null`);
    else if (opts.status === 'revoked') conditions.push(sql`${invitations.revokedAt} is not null`);
    else if (opts.status === 'expired') conditions.push(sql`${invitations.usedAt} is null and ${invitations.revokedAt} is null and ${invitations.expiresAt} < now()`);
    else if (opts.status === 'pending') conditions.push(sql`${invitations.usedAt} is null and ${invitations.revokedAt} is null and ${invitations.expiresAt} >= now()`);

    if (opts.q) {
      const pattern = `%${opts.q.toLowerCase()}%`;
      conditions.push(
        sql`(lower(coalesce(${invitations.firstName},'')) like ${pattern} or lower(coalesce(${invitations.lastName},'')) like ${pattern} or lower(coalesce(${invitations.email},'')) like ${pattern} or lower(coalesce(${invitations.personalEmail},'')) like ${pattern})`,
      );
    }

    const where = conditions.length ? and(...conditions) : sql`true`;

    const rows = await this.db.db
      .select({
        id: invitations.id,
        email: invitations.email,
        firstName: invitations.firstName,
        lastName: invitations.lastName,
        personalEmail: invitations.personalEmail,
        role: invitations.role,
        mass: invitations.mass,
        expiresAt: invitations.expiresAt,
        usedAt: invitations.usedAt,
        revokedAt: invitations.revokedAt,
        createdAt: invitations.createdAt,
      })
      .from(invitations)
      .where(where)
      .orderBy(desc(invitations.createdAt))
      .limit(opts.limit)
      .offset(opts.offset)
      .execute();

    const countRows = await this.db.db.select({ count: sql<number>`count(*)::int` }).from(invitations).where(where).execute();

    return { rows, total: countRows[0]?.count ?? 0 };
  }

  /** Generate a collision-free org login email: first.last@akibatech.com (+ numeric suffix). */
  private async uniqueOrgEmail(firstName: string, lastName: string): Promise<string> {
    const base = `${firstName}.${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');
    let candidate = `${base}@akibatech.com`;
    let suffix = 2;
    while (await this.emailExists(candidate)) {
      candidate = `${base}${suffix}@akibatech.com`;
      suffix += 1;
    }
    return candidate;
  }

  private async emailExists(email: string): Promise<boolean> {
    const rows = await this.db.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1).execute();
    return rows.length > 0;
  }
}

interface BoundInvitation {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  personalEmail: string | null;
  role: string;
  mass: boolean;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

interface InvitationListOptions {
  status?: string;
  q?: string;
  limit: number;
  offset: number;
}

function durationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const [, numStr, unit] = match;
  const num = Number(numStr);
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}