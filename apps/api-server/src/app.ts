// apps/api-server/src/app.ts
// Express app factory (no listen here, so tests can import it).
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { env } from "./config/env";
import { AppError } from "./lib/errors";
import { callsRouter } from "./modules/calls/calls.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.WEB_ADMIN_ORIGIN }));
  app.use(express.json());

  // Liveness
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Versioned API
  const api = express.Router();
  api.get("/ready", (_req, res) =>
    res.json({ data: { status: "ready", checks: { db: "skipped", redis: "skipped" } } }),
  );
  api.use("/calls", callsRouter);
  api.use("/dashboard", dashboardRouter);
  app.use("/api/v1", api);

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  // Error handler → standard envelope
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res
        .status(err.status)
        .json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ error: { code: "INTERNAL", message: "Internal server error" } });
  });

  return app;
}
