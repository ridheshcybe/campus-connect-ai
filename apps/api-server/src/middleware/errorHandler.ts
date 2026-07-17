// apps/api-server/src/middleware/errorHandler.ts
//
// Mounted last in app.ts. Catches thrown AppErrors (and anything else) from
// any route — including async ones, since Express 5 forwards rejected
// promises from route handlers here automatically.

import { ErrorRequestHandler } from "express";
import { AppError } from "../utils/errors";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error("[unhandled error]", err);
  res.status(500).json({ error: "Internal server error" });
};
