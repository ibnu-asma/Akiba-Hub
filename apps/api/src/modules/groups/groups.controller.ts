import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
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

const deleteDto = z.object({ id: z.string().uuid() });

@Controller('groups')
@UseGuards(AuthGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  async list() {
    return this.groups.list();
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
      actor: { id: principal.id, name: 'Academy' },
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard, new MockRulesGuard(3))
  async remove(@Param('id') id: string, @CurrentPrincipal() principal: Principal) {
    void deleteDto.parse({ id });
    await this.groups.softDelete(id, { id: principal.id, name: 'Academy' });
    return { ok: true };
  }
}