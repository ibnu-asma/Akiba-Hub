import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { STATUS_CODES } from 'http';
import { ZodError } from 'zod';
import { DomainError, ERROR_CODES } from '@hub/shared';

/**
 * Converts any thrown error → structured JSON body. Single exception surface.
 *
 *  - DomainError          → its own status + code (domain rules)
 *  - ZodError             → 400 VALIDATION_ERROR + per-field issues (DTO parse failures)
 *  - HttpException (Nest) → its HTTP status + SCREAMING_SNAKE code (404 → NOT_FOUND, 401 → UNAUTHORIZED…)
 *  - anything else        → 500 INTERNAL_ERROR (logged server-side, never leaked)
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): unknown {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest();

    if (exception instanceof DomainError) {
      response.status(exception.status).json({
        error: { code: exception.code, message: exception.message, details: exception.details },
      });
      return undefined;
    }

    if (exception instanceof ZodError) {
      response.status(400).json({
        error: {
          code: ERROR_CODES.VALIDATION,
          message: 'Validation failed',
          details: {
            issues: exception.issues.map((issue) => ({
              path: issue.path.join('.'),
              code: issue.code,
              message: issue.message,
            })),
          },
        },
      });
      return undefined;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const raw = typeof body === 'string' ? body : (body as { message?: string | string[] }).message;
      const message = Array.isArray(raw) ? raw.join('; ') : (raw ?? exception.message);
      response.status(status).json({
        error: {
          code: (STATUS_CODES[status] ?? 'HTTP_ERROR').toUpperCase().replace(/\s+/g, '_'),
          message,
        },
      });
      return undefined;
    }

    console.error('[error]', exception);
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
    return undefined;
  }
}

export { registerExceptionHandler };

function registerExceptionHandler(): void {
  /* Kept for parity with the exception handler layout; filter is wired in main.ts. */
}