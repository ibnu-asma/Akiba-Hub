import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { PROBLEM_DIFFICULTIES, PROBLEM_PLATFORMS } from '@hub/shared';
import { z } from 'zod';
import { ProblemsService } from './problems.service.js';

const createDto = z.object({
  name: z.string().min(1).max(200),
  platform: z.enum(Object.values(PROBLEM_PLATFORMS) as [string, ...string[]]),
  difficulty: z.enum(Object.values(PROBLEM_DIFFICULTIES) as [string, ...string[]]),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  link: z.string().url().max(500),
});

@Controller('problems')
@UseGuards(AuthGuard)
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  /** Library read — every role sees the problem cards (spec §6.3). */
  @Get()
  async list(@Query('limit') limit?: string) {
    const parsed = Number.parseInt(limit ?? '', 10);
    return this.problems.list(Number.isNaN(parsed) ? 100 : parsed);
  }

  /** HoE/HoA: add a DSA problem for the students (spec §7.5). */
  @Post()
  @UseGuards(new MockRulesGuard(2))
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createDto.parse(body);
    return this.problems.create(
      {
        name: parsed.name,
        platform: parsed.platform,
        difficulty: parsed.difficulty,
        tags: parsed.tags,
        link: parsed.link,
      },
      { id: principal.id, name: 'HoE', role: principal.role },
    );
  }
}