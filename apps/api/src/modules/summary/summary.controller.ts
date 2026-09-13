import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { ScopeService } from '../../common/auth/scope.service.js';
import { SummaryService } from './summary.service.js';

/** Summary reporting hub (SPEC §7.10) — HoE/HoA read-only aggregation. */
@Controller('summary')
@UseGuards(AuthGuard, new MockRulesGuard(2))
export class SummaryController {
  constructor(
    private readonly summary: SummaryService,
    private readonly scopes: ScopeService,
  ) {}

  private async scope(principal: Principal) {
    return this.scopes.forUser(principal.id, principal.role);
  }

  @Get('attendance')
  async attendance(@CurrentPrincipal() principal: Principal) {
    return this.summary.attendance(await this.scope(principal));
  }

  @Get('consistency')
  async consistency(@CurrentPrincipal() principal: Principal) {
    return this.summary.consistency(await this.scope(principal));
  }

  @Get('completion')
  async completion(@CurrentPrincipal() principal: Principal) {
    return this.summary.completion(await this.scope(principal));
  }

  @Get('exercise')
  async exercise(@CurrentPrincipal() principal: Principal) {
    return this.summary.exercise(await this.scope(principal));
  }

  @Get('upsolving')
  async upsolving(@CurrentPrincipal() principal: Principal) {
    return this.summary.upsolving(await this.scope(principal));
  }

  @Get('divisions')
  async divisions(@CurrentPrincipal() principal: Principal) {
    return this.summary.divisions(await this.scope(principal));
  }
}
