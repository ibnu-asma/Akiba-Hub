import { Inject, Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { RoadmapsService } from './roadmaps.service.js';
import { z } from 'zod';
import { DomainError, ROLES, ROLE_LEVEL } from '@hub/shared';

const createDto = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).nullish(),
  sections: z.array(
    z.object({
      title: z.string().min(1).max(255),
      items: z.array(
        z.object({
          type: z.enum(['video', 'reading', 'problem']),
          title: z.string().min(1).max(500),
          link: z.string().url().max(2000),
        })
      ),
    })
  ).min(1),
});


const updateDto = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).nullish(),
  sections: z.array(
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1).max(255),
      items: z.array(
        z.object({
          id: z.string().uuid().optional(),
          type: z.enum(['video', 'reading', 'problem']),
          title: z.string().min(1).max(500),
          link: z.string().url().max(2000),
        })
      ),
    })
  ).min(1),
});

@Controller('roadmaps')
@UseGuards(AuthGuard)
export class RoadmapsController {
  constructor(@Inject(RoadmapsService) private readonly roadmaps: RoadmapsService) {}

  @Get()
  async list() {
    return this.roadmaps.findAll();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.roadmaps.findOne(id);
  }

  @Get(':id/progress')
  async getProgress(@CurrentPrincipal() principal: Principal) {
    return this.roadmaps.getProgress(principal.id);
  }

  @Post('items/:itemId/toggle')
  async toggleProgress(@Param('itemId') itemId: string, @CurrentPrincipal() principal: Principal) {
    return this.roadmaps.toggleProgress(principal.id, itemId);
  }

  @Post()
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const level = ROLE_LEVEL[principal.role as keyof typeof ROLE_LEVEL] ?? 1;
    if (level < 2) throw DomainError.forbidden('Only Heads can create roadmaps');
    const parsed = createDto.parse(body);
    return this.roadmaps.create(parsed, principal.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const level = ROLE_LEVEL[principal.role as keyof typeof ROLE_LEVEL] ?? 1;
    if (level < 2) throw DomainError.forbidden('Only Heads can edit roadmaps');
    const parsed = updateDto.parse(body);
    return this.roadmaps.update(id, parsed, principal.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentPrincipal() principal: Principal) {
    const level = ROLE_LEVEL[principal.role as keyof typeof ROLE_LEVEL] ?? 1;
    if (level < 2) throw DomainError.forbidden('Only Heads can delete roadmaps');
    await this.roadmaps.delete(id);
    return { success: true };
  }
}
