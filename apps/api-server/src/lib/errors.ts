// apps/api-server/src/lib/errors.ts
// One error hierarchy. Controllers/services throw these; the error middleware
// converts them to the standard { error: { code, message } } envelope.

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown, message = "Validation failed") {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}
