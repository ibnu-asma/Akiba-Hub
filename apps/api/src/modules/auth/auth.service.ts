import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { DomainError, ROLES } from '@hub/shared';
import { JwtService } from '../../common/auth/jwt.service.js';
import { AuthRepository } from './infrastructure/auth.repository.js';
import { AuthSession } from './auth.dto.js';

/** Login / invite-registration use-cases (application layer). */
@Injectable()
export class AuthService {
  constructor(private readonly repo: AuthRepository, private readonly jwt: JwtService) {}

  async login(email: string, password: string): Promise<AuthSession> {
    const user = await this.repo.findByEmail(email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw DomainError.forbidden('Invalid email or password');
    }
    return this.buildSession(user);
  }

  /**
   * Register via an invitation token (SPEC §8.5 mass-invite flow).
   * The invite carries role + optional group; only unused, unexpired tokens redeem.
   */
  async registerWithInvite(
    token: string,
    payload: { name: string; password: string; country: string; university: string },
  ): Promise<AuthSession> {
    const tokenHash = hashToken(token);
    const invite = await this.repo.findInviteByHash(tokenHash);
    if (!invite) throw DomainError.notFound('Invitation not found');
    if (invite.usedAt) throw DomainError.conflict('Invitation already used');
    if (invite.expiresAt < new Date()) throw DomainError.conflict('Invitation expired');

    const role = invite.role in ROLES ? invite.role : ROLES.student;
    const user = await this.repo.create({
      email: payload.name.toLowerCase().replace(/\s+/g, '.') + '@a2sv.org', // demo derivation; replace with invite.email when provided
      name: payload.name,
      passwordHash: await bcrypt.hash(payload.password, 10),
      role,
      groupId: invite.groupId,
      country: payload.country,
      university: payload.university,
      invitedById: null,
    });
    await this.repo.markInviteUsed(invite.id, user.id);
    return this.buildSession(user);
  }

  async me(userId: string): Promise<{ id: string; name: string; email: string; role: string }> {
    const user = await this.repo.findById(userId);
    if (!user) throw DomainError.notFound('User not found');
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  private buildSession(user: { id: string; name: string; email: string; role: string }): AuthSession {
    const accessToken = this.jwt.sign({ sub: user.id, role: user.role, session: 1, name: user.name });
    return {
      accessToken,
      refreshToken: 'refresh:issued-later', // opaque refresh tokens: phase-2
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}

/** Deterministic O(1) token indexing — hash at rest only. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}