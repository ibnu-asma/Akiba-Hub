import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseProvider } from '../../config/database.provider.js';
import { invitations, eq } from '@hub/database';
import { env } from '../../config/env.js';
import { hashToken } from '../auth/auth.service.js';
import { AuditService } from '../../common/audit/audit.service.js';
import { DomainError } from '@hub/shared';

export interface InvitationResult {
  token: string; // plaintext once, then only the hash is stored
  email?: string | null;
  role: string;
  expiresAt: Date;
}

/**
 * Invitation use-cases — the ONLY entry to the Hub (HoA; spec §8.5).
 * mass = true  → one invite per email (bulk "Register Invite" link)
 * mass = false → "take-over" an existing user and re-assign role
 */
@Injectable()
export class InvitationsService {
  constructor(private readonly db: DatabaseProvider, private readonly audit: AuditService) {}

  async generateMass(emails: string[], role: string, actor: { id: string; name: string }): Promise<InvitationResult[]> {
    const ttlMs = durationToMs(env.INVITE_EXPIRES);
    const out: InvitationResult[] = [];
    for (const email of emails) {
      const token = crypto.randomBytes(32).toString('hex');
      out.push({
        token,
        email,
        role,
        expiresAt: new Date(Date.now() + ttlMs),
      });
    }
    await this.db.db
      .insert(invitations)
      .values(out.map((o) => ({
        email: o.email,
        role: o.role,
        mass: true,
        tokenHash: hashToken(o.token),
        expiresAt: o.expiresAt,
        createdBy: actor.id,
      })))
      .execute();
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: 'head_of_academy',
      action: 'CREATE',
      entityType: 'invitation',
      description: `sent ${emails.length} invitation(s) with role ${role}`,
    });
    return out;
  }

  async generateTakeOver(userId: string, role: string, actor: { id: string; name: string }): Promise<InvitationResult> {
    const existing = await this.db.db.select().from(invitations).where(eq(invitations.takeOverUserId, userId)).execute();
    if (existing[0]) throw DomainError.conflict('This user already has an active take-over invite');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + durationToMs(env.INVITE_EXPIRES));
    await this.db.db
      .insert(invitations)
      .values({
        role,
        mass: false,
        takeOverUserId: userId,
        tokenHash: hashToken(token),
        expiresAt,
        createdBy: actor.id,
      })
      .execute();
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: 'head_of_academy',
      action: 'CREATE',
      entityType: 'invitation',
      description: `issued a take-over invite for user ${userId} with role ${role}`,
    });
    return { token, role, email: null, expiresAt };
  }

  async list(): Promise<BoundInvitation[]> {
    const rows = await this.db.db
      .select({ id: invitations.id, email: invitations.email, role: invitations.role, mass: invitations.mass, expiresAt: invitations.expiresAt, usedAt: invitations.usedAt })
      .from(invitations)
      .orderBy(invitations.createdAt)
      .execute();
    return rows;
  }
}

interface BoundInvitation {
  id: string;
  email: string | null;
  role: string;
  mass: boolean;
  expiresAt: Date;
  usedAt: Date | null;
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