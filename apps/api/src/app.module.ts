import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseProvider } from './config/database.provider.js';
import { ErrorFilter } from './common/errors/error.filter.js';
import { JwtService } from './common/auth/jwt.service.js';
import { AuthGuard } from './common/auth/auth.guard.js';
import { ScopeService } from './common/auth/scope.service.js';
import { AuditService } from './common/audit/audit.service.js';

import { AuthController } from './modules/auth/auth.controller.js';
import { AuthService } from './modules/auth/auth.service.js';
import { AuthRepository } from './modules/auth/infrastructure/auth.repository.js';

import { UsersController } from './modules/users/users.controller.js';
import { UsersService } from './modules/users/users.service.js';

import { SuperGroupsController } from './modules/supergroups/supergroups.controller.js';
import { SuperGroupsService } from './modules/supergroups/supergroups.service.js';

import { GroupsController } from './modules/groups/groups.controller.js';
import { GroupsService } from './modules/groups/groups.service.js';

import { SessionsController } from './modules/sessions/sessions.controller.js';
import { SessionsService } from './modules/sessions/sessions.service.js';

import { InvitationsController } from './modules/invitations/invitations.controller.js';
import { InvitationsService } from './modules/invitations/invitations.service.js';

import { ActivitiesController } from './modules/activities/activities.controller.js';

import { ProblemsController } from './modules/problems/problems.controller.js';
import { ProblemsService } from './modules/problems/problems.service.js';

import { TracksController } from './modules/tracks/tracks.controller.js';
import { TracksService } from './modules/tracks/tracks.service.js';

import { ContestsController } from './modules/contests/contests.controller.js';
import { ContestsService } from './modules/contests/contests.service.js';

import { DailyProblemsController } from './modules/daily-problems/daily-problems.controller.js';
import { DailyProblemsService } from './modules/daily-problems/daily-problems.service.js';

/**
 * Root composition root. Shared singletons are provided once at module root;
 * feature modules are controllers + their service graph only.
 */
@Module({
  controllers: [
    AuthController,
    UsersController,
    SuperGroupsController,
    GroupsController,
    SessionsController,
    InvitationsController,
    ActivitiesController,
    ProblemsController,
    TracksController,
    ContestsController,
    DailyProblemsController,
  ],
  providers: [
    // shared infra
    DatabaseProvider,
    { provide: APP_FILTER, useClass: ErrorFilter },
    JwtService,
    AuthGuard,
    ScopeService,
    AuditService,

    // feature services
    AuthService,
    AuthRepository,
    UsersService,
    SuperGroupsService,
    GroupsService,
    SessionsService,
    InvitationsService,
    ProblemsService,
    TracksService,
    ContestsService,
    DailyProblemsService,
  ],
})
export class AppModule {}