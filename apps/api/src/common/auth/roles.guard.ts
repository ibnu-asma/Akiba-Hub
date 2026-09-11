import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ROLE_LEVEL, Role } from '@hub/shared';

/**
 * Mock Rules guard. Usage:
 *   @UseGuards(AuthGuard, new MockRulesGuard(3))  // requires level >= 3 (HoA)
 *
 * In production prefer a metadata-based approach; level table keeps it explicit.
 */
@Injectable()
export class MockRulesGuard implements CanActivate {
  constructor(private readonly minimumLevel: number) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const level = ROLE_LEVEL[req.principal.role as Role];
    if (!level || level < this.minimumLevel) {
      throw new ForbiddenException('Insufficient privileges');
    }
    return true;
  }
}

export { ROLE_LEVEL };