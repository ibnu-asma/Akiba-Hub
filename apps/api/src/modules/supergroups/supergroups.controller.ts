import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { z } from 'zod';
import { SuperGroupsService } from './supergroups.service.js';

const createDto = z.object({ name: z.string().min(1).max(120) });
const deleteDto = z.object({ id: z.string().uuid() });

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
    const { name } = createDto.parse(body);
    return this.superGroups.create(name, { id: principal.id, name: 'Academy' }, principal.role === 'head_of_academy');
  }

  @Delete(':id')
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async remove(@Param('id') id: string, @CurrentPrincipal() principal: Principal) {
    void deleteDto.parse({ id });
    await this.superGroups.remove(id, { id: principal.id, name: 'Academy' });
    return { ok: true };
  }
}