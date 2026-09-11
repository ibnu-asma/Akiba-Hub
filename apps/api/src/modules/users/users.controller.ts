import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
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

const deleteUserDto = z.object({ userId: z.string().uuid() });

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly scopes: ScopeService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, new MockRulesGuard(2)) // HoE can read; HoA everything
  async list(@CurrentPrincipal() principal: Principal) {
    const scope = await this.scopes.forUser(principal.id, principal.role);
    return this.users.list(scope);
  }

  @Get('removed')
  @UseGuards(AuthGuard, new MockRulesGuard(3)) // HoA only
  async removed() {
    return this.users.listRemoved();
  }

  @Patch(':id/role')
  @UseGuards(AuthGuard, new MockRulesGuard(3)) // HoA only
  async updateRole(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateRoleDto.parse(body);
    void parsed;
    return this.users.updateRole(id, parsed.role, parsed.groupId ?? null);
  }

  @Delete('remove')
  @UseGuards(AuthGuard, new MockRulesGuard(3)) // HoA only
  async remove(@Body() body: unknown) {
    const { userId } = deleteUserDto.parse(body);
    await this.users.softDelete(userId);
    return { ok: true };
  }
}