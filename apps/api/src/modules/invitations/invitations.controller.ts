import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { InvitationsService } from './invitations.service.js';
import { z } from 'zod';

const massInviteDto = z.object({
  emails: z.array(z.string().email()).min(1),
  role: z.string().min(1),
});

const takeOverDto = z.object({
  userId: z.string().uuid(),
  role: z.string().min(1),
});

@Controller('invitations')
@UseGuards(AuthGuard, new MockRulesGuard(3)) // HoA only
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('mass')
  @HttpCode(201)
  async mass(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = massInviteDto.parse(body);
    const created = await this.invitations.generateMass(parsed.emails, parsed.role, {
      id: principal.id,
      name: 'Academy',
    });
    return { invitations: created };
  }

  @Post('take-over')
  @HttpCode(201)
  async takeOver(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = takeOverDto.parse(body);
    return this.invitations.generateTakeOver(parsed.userId, parsed.role, {
      id: principal.id,
      name: 'Academy',
    });
  }

  @Get()
  async list() {
    return this.invitations.list();
  }
}