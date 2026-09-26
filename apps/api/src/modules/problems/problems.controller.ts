import { Inject, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { PROBLEM_DIFFICULTIES, PROBLEM_PLATFORMS } from '@hub/shared';
import { z } from 'zod';
import { ProblemsService } from './problems.service.js';

const problemDto = z.object({
  name: z.string().min(1).max(200),
  platform: z.enum(Object.values(PROBLEM_PLATFORMS) as [string, ...string[]]),
  difficulty: z.enum(Object.values(PROBLEM_DIFFICULTIES) as [string, ...string[]]),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  link: z.string().url().max(500),
});

const listDto = z.object({
  q: z.string().max(120).optional(),
  difficulty: z.enum(Object.values(PROBLEM_DIFFICULTIES) as [string, ...string[]]).optional(),
  tag: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

@Controller('problems')
@UseGuards(AuthGuard)
export class ProblemsController {
  constructor(@Inject(ProblemsService) private readonly problems: ProblemsService) {}

  /** Library read — every role sees the problem cards (spec §6.3). */
  /** Library read — single problem (spec §6.3). */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.problems.findOne(id);
  }

  @Get()
  async list(@Query() query: Record<string, unknown>) {
    const { q, difficulty, tag, limit, offset } = listDto.parse(query);
    return this.problems.list({ q, difficulty, tag, limit, offset });
  }

  /** HoE/HoA: add a DSA problem for the students (spec §7.5). */
  @Post()
  @UseGuards(new MockRulesGuard(2))
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = problemDto.parse(body);
    return this.problems.create(
      { name: parsed.name, platform: parsed.platform, difficulty: parsed.difficulty, tags: parsed.tags, link: parsed.link },
      { id: principal.id, name: principal.name, role: principal.role },
    );
  }

  /** HoE/HoA: edit a problem (spec §7.5). */
  @Patch(':id')
  @UseGuards(new MockRulesGuard(2))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = problemDto.parse(body);
    return this.problems.update(
      id,
      { name: parsed.name, platform: parsed.platform, difficulty: parsed.difficulty, tags: parsed.tags, link: parsed.link },
      { id: principal.id, name: principal.name, role: principal.role },
    );
  }

  /** HoE/HoA: delete a problem (soft, spec §7.5). */
  @Delete(':id')
  @UseGuards(new MockRulesGuard(2))
  async remove(@Param('id') id: string, @CurrentPrincipal() principal: Principal) {
    await this.problems.softDelete(id, { id: principal.id, name: principal.name, role: principal.role });
    return { ok: true };
  }
}
