import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenPayload } from './jwt.service.js';

export interface Principal {
  id: string;
  role: string;
}

/** Extract the authenticated principal (set by AuthGuard) from the request. */
export const CurrentPrincipal = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const p = req.principal as AccessTokenPayload | undefined;
  if (!p) throw new Error('CurrentPrincipal used without AuthGuard');
  return { id: p.sub, role: p.role } satisfies Principal;
});