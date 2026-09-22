import { Inject, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { z } from 'zod';
import { GroupsService } from './groups.service.js';

const createDto = z.object({
  name: z.string().min(1).max(120),
  shortName: z.string().min(1).max(16),
  description: z.string().max(2000).optional(),
  country: z.string().max(80).optional(),
  superGroupId: z.string().uuid().optional(),
  headUserIds: z.array(z.string().uuid()).default([]),
});

const assignHeadsDto = z.object({ headUserIds: z.array(z.string().uuid()).default([]) });
const studentsDto = z.object({ userIds: z.array(z.string().uuid()).min(1) });

const updateDto = z.object({
  name: z.string().min(1).max(120),
  shortName: z.string().min(1).max(16),
  description: z.string().max(2000).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  superGroupId: z.string().uuid().nullable().optional(),
});

@Controller('groups')
@UseGuards(AuthGuard)
export class GroupsController {
  constructor(@Inject(GroupsService) private readonly groups: GroupsService) {}

  @Get()
  async list() {
    return this.groups.list();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.groups.getById(id);
  }

  @Get(':id/progress')
  async getProgress(@Param('id') id: string) {
    return this.groups.getProgress(id);
  }

  @Post()
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createDto.parse(body);
    return this.groups.create({
      name: parsed.name,
      shortName: parsed.shortName,
      description: parsed.description,
      country: parsed.country,
      superGroupId: parsed.superGroupId,
      headUserIds: parsed.headUserIds,
      actor: { id: principal.id, name: principal.name },
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = updateDto.parse(body);
    await this.groups.update(
      id,
      {
        name: parsed.name,
        shortName: parsed.shortName,
        description: parsed.description ?? null,
        country: parsed.country ?? null,
        superGroupId: parsed.superGroupId ?? null,
      },
      { id: principal.id, name: principal.name },
    );
    return { ok: true };
  }

  @Post(':id/heads')
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async assignHeads(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = assignHeadsDto.parse(body);
    await this.groups.assignHeads(id, parsed.headUserIds, { id: principal.id, name: principal.name });
    return { ok: true };
  }

  @Post(':id/students')
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async addStudents(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = studentsDto.parse(body);
    return this.groups.addStudents(id, parsed.userIds, { id: principal.id, name: principal.name });
  }

  @Delete(':id/students/:userId')
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async removeStudent(@Param('id') id: string, @Param('userId') userId: string, @CurrentPrincipal() principal: Principal) {
    await this.groups.removeStudent(id, userId, { id: principal.id, name: principal.name });
    return { ok: true };
  }

  @Delete(':id')
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async remove(@Param('id') id: string, @CurrentPrincipal() principal: Principal) {
    await this.groups.softDelete(id, { id: principal.id, name: principal.name });
    return { ok: true };
  }
}
