// apps/api-server/src/utils/errors.ts
//
// A route can `throw new AppError(404, "Call not found")` instead of
// hand-writing `res.status(404).json({ error: ... })` everywhere. Express 5
// automatically forwards thrown errors (including from async handlers) to
// the error-handling middleware in middleware/errorHandler.ts.

export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}
