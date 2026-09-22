import { Inject, Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { InvitationsService } from './invitations.service.js';
import { z } from 'zod';

const massInviteDto = z.object({
  rows: z
    .array(
      z.object({
        firstName: z.string().min(1).max(80),
        lastName: z.string().min(1).max(80),
        personalEmail: z.string().email(),
      }),
    )
    .min(1),
  role: z.string().min(1),
});

const takeOverDto = z.object({
  userId: z.string().uuid(),
  role: z.string().min(1),
});

const listDto = z.object({
  status: z.enum(['pending', 'used', 'expired', 'revoked']).optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

@Controller('invitations')
@UseGuards(AuthGuard, new MockRulesGuard(3)) // HoA only
export class InvitationsController {
  constructor(@Inject(InvitationsService) private readonly invitations: InvitationsService) {}

  @Post('mass')
  @HttpCode(201)
  async mass(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = massInviteDto.parse(body);
    const created = await this.invitations.generateMass(parsed.rows, parsed.role, {
      id: principal.id,
      name: principal.name,
    });
    return { invitations: created };
  }

  @Post('take-over')
  @HttpCode(201)
  async takeOver(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = takeOverDto.parse(body);
    return this.invitations.generateTakeOver(parsed.userId, parsed.role, {
      id: principal.id,
      name: principal.name,
    });
  }

  @Post(':id/resend')
  async resend(@Param('id') id: string) {
    return this.invitations.resend(id);
  }

  @Post(':id/revoke')
  async revoke(@Param('id') id: string) {
    return this.invitations.revoke(id);
  }

  @Get()
  async list(@Query() query: Record<string, unknown>) {
    const { status, q, limit, offset } = listDto.parse(query);
    return this.invitations.list({ status, q, limit, offset });
  }
}
