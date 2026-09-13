import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { z } from 'zod';
import { SuperGroupsService } from './supergroups.service.js';

const createDto = z.object({ name: z.string().min(1).max(120), groupIds: z.array(z.string().uuid()).default([]) });
const updateDto = z.object({ name: z.string().min(1).max(120) });
const setGroupsDto = z.object({ groupIds: z.array(z.string().uuid()).default([]) });

@Controller('super-groups')
@UseGuards(AuthGuard)
export class SuperGroupsController {
  constructor(private readonly superGroups: SuperGroupsService) {}

  @Get()
  async list() {
    return this.superGroups.list();
  }

  @Post()
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const { name, groupIds } = createDto.parse(body);
    return this.superGroups.create(name, groupIds, { id: principal.id, name: principal.name });
  }

  @Patch(':id')
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const { name } = updateDto.parse(body);
    await this.superGroups.update(id, name, { id: principal.id, name: principal.name });
    return { ok: true };
  }

  @Post(':id/groups')
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async setGroups(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const { groupIds } = setGroupsDto.parse(body);
    await this.superGroups.setGroups(id, groupIds, { id: principal.id, name: principal.name });
    return { ok: true };
  }

  @Delete(':id')
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async remove(@Param('id') id: string, @CurrentPrincipal() principal: Principal) {
    await this.superGroups.remove(id, { id: principal.id, name: principal.name });
    return { ok: true };
  }
}
