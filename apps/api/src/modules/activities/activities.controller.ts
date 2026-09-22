import { Inject, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { AuditService } from '../../common/audit/audit.service.js';
import { z } from 'zod';

const listDto = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  before: z.string().optional(),
});

/** Recent Actions feed (HoA; spec §8.8). */
@Controller('activities')
@UseGuards(AuthGuard, new MockRulesGuard(3))
export class ActivitiesController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  async list(@Query() query: Record<string, unknown>) {
    const { limit, before } = listDto.parse(query);
    return this.audit.list(limit, before);
  }
}