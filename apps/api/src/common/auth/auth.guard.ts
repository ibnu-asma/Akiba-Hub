import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from './jwt.service.js';

/**
 * Bearer-token guard. Attaches the authenticated principal to the request
 * as `request.principal = { id, role }`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();
    try {
      req.principal = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}