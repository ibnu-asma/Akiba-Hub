import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { ScopeService } from '../../common/auth/scope.service.js';
import { z } from 'zod';
import { ComparisonService } from './comparison.service.js';

const compareDto = z.object({
  groupIds: z.array(z.string().uuid()).min(1),
  mode: z.enum(['summary', 'attendance', 'consistency', 'completion', 'contest']).default('summary'),
  range: z.enum(['week', 'all']).default('all'),
  output: z.enum(['table', 'graph']).default('table'),
});

/** Group Comparison (SPEC §7.11, §8.10) — HoE/HoA rank groups across a mode. */
@Controller('comparison')
@UseGuards(AuthGuard, new MockRulesGuard(2))
export class ComparisonController {
  constructor(
    private readonly comparison: ComparisonService,
    private readonly scopes: ScopeService,
  ) {}

  @Post()
  async compare(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = compareDto.parse(body);
    const scope = await this.scopes.forUser(principal.id, principal.role);
    return this.comparison.compare(parsed.groupIds, parsed.mode, parsed.range, scope);
  }
}
