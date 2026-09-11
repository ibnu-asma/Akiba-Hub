import { Body, Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { CONTEST_TYPES } from '@hub/shared';
import { z } from 'zod';
import { ContestsService } from './contests.service.js';

const createDto = z.object({
  name: z.string().min(1).max(200),
  number: z.number().int().positive().nullish(),
  type: z.enum(Object.values(CONTEST_TYPES) as [string, ...string[]]).default(CONTEST_TYPES.standard),
  unrated: z.boolean().default(false),
  date: z.string().min(1),
  standingsLink: z.string().url().max(500).nullish(),
  groupIds: z.array(z.string().uuid()).min(1),
});

const attachDto = z.object({
  problemIds: z.array(z.string().uuid()).min(1),
});

@Controller('contests')
@UseGuards(AuthGuard)
export class ContestsController {
  constructor(private readonly contests: ContestsService) {}

  /** Contest feed — every role sees the cards + "Standing" badge (spec §6.8). */
  @Get()
  async list(@Query('limit') limit?: string) {
    const parsed = Number.parseInt(limit ?? '', 10);
    return this.contests.list(Number.isNaN(parsed) ? 50 : parsed);
  }

  /** HoE/HoA: schedule an A2SV contest and assign participating groups (spec §7.6). */
  @Post()
  @UseGuards(new MockRulesGuard(2))
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createDto.parse(body);
    return this.contests.create(
      {
        name: parsed.name,
        number: parsed.number ?? null,
        type: parsed.type,
        unrated: parsed.unrated,
        date: parsed.date,
        standingsLink: parsed.standingsLink ?? null,
        groupIds: parsed.groupIds,
      },
      { id: principal.id, name: principal.name, role: principal.role },
    );
  }

  /** HoE/HoA: attach contest questions — pseudo letters A, B, C… (spec §7.6). */
  @Post(':id/problems')
  @UseGuards(new MockRulesGuard(2))
  async attach(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = attachDto.parse(body);
    const contest = await this.contests.list(200);
    const name = contest.find((row) => row.id === id)?.name ?? 'contest';
    return this.contests.attachProblems(id, name, parsed.problemIds, {
      id: principal.id,
      name: principal.name,
      role: principal.role,
    });
  }
}