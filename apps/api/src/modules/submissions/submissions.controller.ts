import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { ScopeService } from '../../common/auth/scope.service.js';
import { z } from 'zod';
import { SubmissionsService } from './submissions.service.js';

const createDto = z.object({
  problemId: z.string().uuid(),
  language: z.string().min(1).max(48),
  code: z.string().max(20000).nullish(),
  timeSpentMin: z.number().int().min(0).default(0),
  tries: z.number().int().min(1).default(1),
  source: z.enum(['manual', 'extension']).default('manual'),
  contestProblemId: z.string().uuid().nullish(),
});

/** Submissions — any authenticated user logs solves; feed is role-scoped (spec §6.4, §7.13). */
@Controller('submissions')
@UseGuards(AuthGuard)
export class SubmissionsController {
  constructor(
    private readonly submissions: SubmissionsService,
    private readonly scopes: ScopeService,
  ) {}

  @Get()
  async list(@CurrentPrincipal() principal: Principal, @Query('limit') limit?: string, @Query('group') group?: string) {
    const scope = await this.scopes.forUser(principal.id, principal.role);
    const parsed = Number.parseInt(limit ?? '', 10);
    return this.submissions.list(scope, principal.id, Number.isNaN(parsed) ? 100 : parsed, { group: group === '1' });
  }

  @Get('solvers')
  async solvers(@CurrentPrincipal() principal: Principal) {
    const scope = await this.scopes.forUser(principal.id, principal.role);
    return this.submissions.solvers(scope);
  }

  @Post()
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createDto.parse(body);
    return this.submissions.create(
      {
        problemId: parsed.problemId,
        language: parsed.language,
        code: parsed.code ?? null,
        timeSpentMin: parsed.timeSpentMin,
        tries: parsed.tries,
        source: parsed.source,
        contestProblemId: parsed.contestProblemId ?? null,
      },
      { id: principal.id },
    );
  }
}
