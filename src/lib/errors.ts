// src/lib/errors.ts
// Production-grade error handling

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string = "INTERNAL_ERROR",
    public details?: Record<string, any>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(400, message, "VALIDATION_ERROR", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(401, message, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Forbidden") {
    super(403, message, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(409, message, "CONFLICT", details);
  }
}

export class BusinessRuleViolation extends AppError {
  constructor(message: string, code: string, details?: Record<string, any>) {
    super(422, message, code, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(500, message, "DATABASE_ERROR");
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super(429, "Too many requests", "RATE_LIMIT_EXCEEDED");
  }
}

export class IdempotencyError extends AppError {
  constructor(message: string) {
    super(409, message, "IDEMPOTENCY_ERROR");
  }
}
