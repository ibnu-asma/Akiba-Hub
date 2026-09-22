import { Inject, Body, Controller, Get, Post, Param, Patch, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { z } from 'zod';
import { FundsService } from './funds.service.js';

const createDto = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(500).nullish(),
  amount: z.number().positive(),
  currency: z.string().min(1).max(12).default('ETB'),
});

const assignDto = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must look like 2024-10'),
  rows: z.array(z.object({ userId: z.string().uuid(), amount: z.number().positive() })).min(1),
});

const patchDto = z.object({ status: z.enum(['pending', 'paid']) });

/**
 * Stipends & Funds (SPEC §7.8) — reads AND writes are both gated to HoE/HoA;
 * students never see stipends. "In-person heads only" is a process rule the
 * hub can't verify from a session, so the API keeps one staff-level guard.
 */
@Controller('funds')
@UseGuards(AuthGuard)
export class FundsController {
  constructor(@Inject(FundsService) private readonly funds: FundsService) {}

  @Get()
  @UseGuards(new MockRulesGuard(2))
  async list() {
    return this.funds.list();
  }

  @Get(':id/stipends')
  @UseGuards(new MockRulesGuard(2))
  async listStipends(@Param('id') id: string) {
    return this.funds.listStipends(id);
  }

  /** HoE/HoA: create a named budget (name, description, amount, currency). */
  @Post()
  @UseGuards(new MockRulesGuard(2))
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createDto.parse(body);
    return this.funds.create(
      {
        name: parsed.name,
        description: parsed.description ?? null,
        amount: parsed.amount,
        currency: parsed.currency,
      },
      { id: principal.id, name: principal.name, role: principal.role },
    );
  }

  /** HoE/HoA: batch-assign monthly stipends from a fund (idempotent upsert). */
  @Post(':id/stipends')
  @UseGuards(new MockRulesGuard(2))
  async assign(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = assignDto.parse(body);
    return this.funds.assignStipends(id, parsed, { id: principal.id, name: principal.name, role: principal.role });
  }

  /** HoE/HoA: mark a stipend paid (or back to pending). */
  @Patch('stipends/:id')
  @UseGuards(new MockRulesGuard(2))
  async markStipend(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = patchDto.parse(body);
    return this.funds.markStipend(id, parsed.status, { id: principal.id, name: principal.name, role: principal.role });
  }
}