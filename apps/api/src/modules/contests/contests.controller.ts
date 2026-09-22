import { Inject, Body, Controller, Get, Post, Param, Query, UseGuards, Patch, Delete } from '@nestjs/common';
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
  constructor(@Inject(ContestsService) private readonly contests: ContestsService) {}

  /** Contest feed — every role sees the cards + "Standing" badge (spec §6.8). */
  @Get()
  async list(@Query('q') q?: string, @Query('type') type?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    const parsedOffset = Number.parseInt(offset ?? '', 10);
    return this.contests.list({
      q,
      type,
      limit: Number.isNaN(parsedLimit) ? undefined : parsedLimit,
      offset: Number.isNaN(parsedOffset) ? 0 : parsedOffset,
    });
  }

  /** Single contest read — every role can view details. */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.contests.findById(id);
  }

  /** HoE/HoA: schedule a contest and assign participating groups (spec §7.7). */
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

  /** HoE/HoA: edit a contest (spec §7.7). */
  @Patch(':id')
  @UseGuards(new MockRulesGuard(2))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createDto.parse(body);
    return this.contests.update(
      id,
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

  /** HoE/HoA: soft-delete a contest (spec §7.7). */
  @Delete(':id')
  @UseGuards(new MockRulesGuard(2))
  async remove(@Param('id') id: string, @CurrentPrincipal() principal: Principal) {
    await this.contests.softDelete(id, { id: principal.id, name: principal.name, role: principal.role });
    return { ok: true };
  }

  /** HoE/HoA: attach contest questions — pseudo letters A, B, C… (spec §7.7). */
  @Post(':id/problems')
  @UseGuards(new MockRulesGuard(2))
  async attach(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = attachDto.parse(body);
    const contests = await this.contests.list({});
    const name = (contests as { id: string; name: string }[]).find((row) => row.id === id)?.name ?? 'contest';
    return this.contests.attachProblems(id, name, parsed.problemIds, {
      id: principal.id,
      name: principal.name,
      role: principal.role,
    });
  }

  /** List a contest's problems (with pseudo letters + details). */
  @Get(':id/problems')
  async listProblems(@Param('id') id: string) {
    return this.contests.listProblems(id);
  }

  /** HoE/HoA: remove one problem from a contest (spec §7.7). */
  @Delete(':id/problems/:problemId')
  @UseGuards(new MockRulesGuard(2))
  async removeProblem(@Param('id') id: string, @Param('problemId') problemId: string, @CurrentPrincipal() principal: Principal) {
    await this.contests.removeProblem(id, problemId, { id: principal.id, name: principal.name, role: principal.role });
    return { ok: true };
  }
}