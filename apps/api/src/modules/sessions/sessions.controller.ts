import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MockRulesGuard } from '../../common/auth/roles.guard.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { ScopeService } from '../../common/auth/scope.service.js';
import { SessionsService } from './sessions.service.js';
import { ATTENDANCE_STATUSES } from '@hub/shared';
import { z } from 'zod';

const createDto = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  date: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().max(200).optional(),
  resourceLink: z.string().url().optional().or(z.literal('')),
  recordingLink: z.string().url().optional().or(z.literal('')),
  lecturer: z.string().max(160).optional(),
  fundId: z.string().uuid().optional(),
  calendarInvite: z.boolean().optional(),
  groupIds: z.array(z.string().uuid()).default([]),
});

const attendanceDto = z.object({
  groupId: z.string().uuid(),
  rows: z.array(
    z.object({
      userId: z.string().uuid(),
      status: z.enum(Object.values(ATTENDANCE_STATUSES) as [string, ...string[]]),
    }),
  ),
});

@Controller('sessions')
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionsService, private readonly scopes: ScopeService) {}

  @Get()
  async list(@CurrentPrincipal() principal: Principal, @Query('all') all?: string) {
    const scope = await this.scopes.forUser(principal.id, principal.role);
    return this.sessions.list(scope.groupIds, scope.isGlobal || all === '1');
  }

  @Post()
  @UseGuards(new MockRulesGuard(2))
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createDto.parse(body);
    return this.sessions.create(
      {
        name: parsed.name,
        description: parsed.description,
        date: parsed.date,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        location: parsed.location,
        resourceLink: parsed.resourceLink,
        recordingLink: parsed.recordingLink,
        lecturer: parsed.lecturer,
        fundId: parsed.fundId,
        calendarInvite: parsed.calendarInvite,
        groupIds: parsed.groupIds,
      },
      { id: principal.id, name: principal.name, role: principal.role },
    );
  }

  @Get('attendance-grid')
  async attendanceGrid(@Query('groupId') groupId: string, @Query('month') month?: string) {
    const m = /^\d{4}-\d{2}$/.test(month ?? '') ? month! : new Date().toISOString().slice(0, 7);
    return this.sessions.getAttendanceGrid(groupId, m);
  }

  @Get('user-attendance')
  async userAttendance(@CurrentPrincipal() principal: Principal, @Query('userId') userId?: string) {
    const targetUserId = userId || principal.id;
    return this.sessions.getUserAttendanceRecords(targetUserId);
  }

  @Get(':id/attendance')
  async attendance(@Param('id') id: string, @Query('groupId') groupId: string) {
    return this.sessions.getAttendance(id, groupId);
  }

  @Post(':id/attendance')
  @UseGuards(new MockRulesGuard(2))
  @HttpCode(204)
  async markAttendance(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = attendanceDto.parse(body);
    await this.sessions.setAttendance(id, parsed.rows, principal.id);
  }
}