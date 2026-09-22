import { Inject, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { TRACK_PHASES } from '@hub/shared';
import { z } from 'zod';
import { TracksService } from './tracks.service.js';

const trackDto = z.object({
  superGroupId: z.string().uuid(),
  phase: z.enum(Object.values(TRACK_PHASES) as [string, ...string[]]),
  name: z.string().min(1).max(160),
});

const addProblemsDto = z.object({
  problemIds: z.array(z.string().uuid()).min(1).max(50),
});

const reassignDto = z.object({
  problemIds: z.array(z.string().uuid()).min(1).max(50),
  targetTrackId: z.string().uuid(),
});

@Controller('tracks')
@UseGuards(AuthGuard)
export class TracksController {
  constructor(@Inject(TracksService) private readonly tracks: TracksService) {}

  @Get()
  async list() {
    return this.tracks.list();
  }

  /** Cross-track exercises feed — "Add exercise" management list (SPEC §7.8). */
  @Get('exercises')
  async listExercises(
    @Query('q') q?: string,
    @Query('trackId') trackId?: string,
    @Query('superGroupId') superGroupId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    const parsedOffset = Number.parseInt(offset ?? '', 10);
    return this.tracks.listExercises({
      q,
      trackId,
      superGroupId,
      limit: Number.isNaN(parsedLimit) ? undefined : parsedLimit,
      offset: Number.isNaN(parsedOffset) ? 0 : parsedOffset,
    });
  }

  /** HoE/HoA: create a track for a program phase (spec §7.6). */
  @Post()
  @UseGuards(new MockRulesGuard(2))
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = trackDto.parse(body);
    return this.tracks.create(parsed, { id: principal.id, name: principal.name, role: principal.role });
  }

  /** HoE/HoA: edit a track (spec §7.6). */
  @Patch(':id')
  @UseGuards(new MockRulesGuard(2))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = trackDto.parse(body);
    return this.tracks.update(id, parsed, { id: principal.id, name: principal.name, role: principal.role });
  }

  /** HoE/HoA: soft-delete a track (spec §7.6 Delete tab). */
  @Delete(':id')
  @UseGuards(new MockRulesGuard(2))
  async remove(@Param('id') id: string, @CurrentPrincipal() principal: Principal) {
    await this.tracks.softDelete(id, { id: principal.id, name: principal.name, role: principal.role });
    return { ok: true };
  }

  @Get(':id/problems')
  async listProblems(@Param('id') id: string) {
    return this.tracks.listProblems(id);
  }

  /** HoE/HoA: add exercises (problems) to a track (spec §7.6). */
  @Post(':id/problems')
  @UseGuards(new MockRulesGuard(2))
  async addProblems(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = addProblemsDto.parse(body);
    return this.tracks.addProblems(id, parsed.problemIds, { id: principal.id, name: principal.name, role: principal.role });
  }

  /** HoE/HoA: remove one exercise from a track. */
  @Delete(':id/problems/:problemId')
  @UseGuards(new MockRulesGuard(2))
  async removeProblem(@Param('id') id: string, @Param('problemId') problemId: string, @CurrentPrincipal() principal: Principal) {
    await this.tracks.removeProblem(id, problemId, { id: principal.id, name: principal.name, role: principal.role });
    return { ok: true };
  }

  /** HoE/HoA: reassign problems from one track to another (spec §7.6). */
  @Post(':id/reassign')
  @UseGuards(new MockRulesGuard(2))
  async reassign(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = reassignDto.parse(body);
    return this.tracks.reassign(id, parsed.problemIds, parsed.targetTrackId, { id: principal.id, name: principal.name, role: principal.role });
  }
}
