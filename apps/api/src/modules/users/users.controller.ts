import { Inject, Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { ScopeService } from '../../common/auth/scope.service.js';
import { UsersService } from './users.service.js';
import { z } from 'zod';

const updateRoleDto = z.object({
  role: z.string(),
  groupId: z.string().uuid().nullable().optional(),
});

const listDto = z.object({
  q: z.string().max(120).optional(),
  role: z.enum(['student', 'head_of_education', 'head_of_academy']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const removedDto = z.object({
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService, @Inject(ScopeService) private readonly scopes: ScopeService, ) {}

  @Get()
  @UseGuards(AuthGuard, new MockRulesGuard(2)) // HoE can read; HoA everything
  async list(@CurrentPrincipal() principal: Principal, @Query() query: Record<string, unknown>) {
    const { q, role, limit, offset } = listDto.parse(query);
    const scope = await this.scopes.forUser(principal.id, principal.role);
    return this.users.list(scope, { q, role, limit, offset });
  }

  @Get('search')
  @UseGuards(AuthGuard)
  async search(@Query('q') q?: string) {
    return this.users.search(q);
  }

  @Get('removed')
  @UseGuards(AuthGuard, new MockRulesGuard(3)) // HoA only
  async removed(@Query() query: Record<string, unknown>) {
    const { q, limit, offset } = removedDto.parse(query);
    return this.users.listRemoved({ q, limit, offset });
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getById(@Param('id') id: string) {
    return this.users.getById(id);
  }

  @Patch(':id/role')
  @UseGuards(AuthGuard, new MockRulesGuard(3)) // HoA only
  async updateRole(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = updateRoleDto.parse(body);
    return this.users.updateRole(id, parsed.role, parsed.groupId ?? null, {
      id: principal.id,
      name: principal.name,
      role: principal.role,
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard, new MockRulesGuard(3)) // HoA only
  async remove(@Param('id') id: string, @CurrentPrincipal() principal: Principal) {
    await this.users.softDelete(id, { id: principal.id, name: principal.name, role: principal.role });
    return { ok: true };
  }
}