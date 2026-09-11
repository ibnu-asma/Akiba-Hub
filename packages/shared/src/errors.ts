/** Application-level error with an HTTP-status-mapped code. */

export const ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static notFound(message: string): DomainError {
    return new DomainError(ERROR_CODES.NOT_FOUND, message, 404);
  }

  static forbidden(message: string): DomainError {
    return new DomainError(ERROR_CODES.FORBIDDEN, message, 403);
  }

  static validation(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError(ERROR_CODES.VALIDATION, message, 400, details);
  }

  static conflict(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError(ERROR_CODES.CONFLICT, message, 409, details);
  }
}