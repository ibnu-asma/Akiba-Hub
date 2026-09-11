import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface AccessTokenPayload {
  sub: string;        // user id
  role: string;
  session: number;    // allows token invalidation on role change
  name?: string;      // display name for audit trails (optional for old tokens)
}

/**
 * Stateless JWT signing/verification for access tokens.
 * Refresh tokens are opaque random strings hashed in DB (not JWTs).
 */
@Injectable()
export class JwtService {
  sign(payload: AccessTokenPayload): string {
    const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES as jwt.SignOptions['expiresIn'] };
    return jwt.sign(payload, env.JWT_SECRET, options);
  }

  verify(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  }
}