import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { z } from 'zod';
import { DailyProblemsService } from './daily-problems.service.js';

const createDto = z.object({
  superGroupId: z.string().uuid(),
  problemId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

@Controller('daily-problems')
@UseGuards(AuthGuard)
export class DailyProblemsController {
  constructor(private readonly dailyProblems: DailyProblemsService) {}

  /** Daily problem feed — every role (students see the challenge card, spec §6.5). */
  @Get()
  async list(@Query('limit') limit?: string) {
    const parsed = Number.parseInt(limit ?? '', 10);
    return this.dailyProblems.list(Number.isNaN(parsed) ? 30 : parsed);
  }

  /** HoE/HoA: assign the 24-hour challenge for a super group (spec §7.7). */
  @Post()
  @UseGuards(new MockRulesGuard(2))
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createDto.parse(body);
    return this.dailyProblems.create(
      { superGroupId: parsed.superGroupId, problemId: parsed.problemId, date: parsed.date },
      { id: principal.id, name: principal.name, role: principal.role },
    );
  }
}