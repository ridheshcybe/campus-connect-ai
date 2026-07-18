import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";

/** Handles 404 Route Not Found errors. */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
}

/** Global Error Handler — envelopes errors into a standard response payload. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details || undefined },
    });
  }

  console.error("❌ Unhandled server error:", err);
  res.status(500).json({
    error: { code: "INTERNAL", message: "Internal server error" },
  });
}
