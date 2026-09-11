import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { TRACK_PHASES } from '@hub/shared';
import { z } from 'zod';
import { TracksService } from './tracks.service.js';

const createDto = z.object({
  superGroupId: z.string().uuid(),
  phase: z.enum(Object.values(TRACK_PHASES) as [string, ...string[]]),
  name: z.string().min(1).max(160),
});

const addProblemsDto = z.object({
  problemIds: z.array(z.string().uuid()).min(1).max(50),
});

@Controller('tracks')
@UseGuards(AuthGuard)
export class TracksController {
  constructor(private readonly tracks: TracksService) {}

  @Get()
  async list() {
    return this.tracks.list();
  }

  /** HoE/HoA: create a track for a program phase (spec §6.2 / §7.5). */
  @Post()
  @UseGuards(new MockRulesGuard(2))
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createDto.parse(body);
    return this.tracks.create(parsed, { id: principal.id, name: 'HoE', role: principal.role });
  }

  @Get(':id/problems')
  async listProblems(@Param('id') id: string) {
    return this.tracks.listProblems(id);
  }

  /** HoE/HoA: add exercises (problems) to a track (spec §7.5). */
  @Post(':id/problems')
  @UseGuards(new MockRulesGuard(2))
  async addProblems(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = addProblemsDto.parse(body);
    return this.tracks.addProblems(id, parsed.problemIds, { id: principal.id, name: 'HoE', role: principal.role });
  }
}