// apps/api-server/src/app.ts
// Express app factory (no listen here, so tests can import it).
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { callsRouter } from "./modules/calls/calls.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.WEB_ADMIN_ORIGIN }));
  app.use(express.json());

  // Liveness
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Versioned API
  const api = express.Router();
  api.get("/ready", (_req, res) =>
    res.json({ data: { status: "ready", checks: { db: "ok", redis: "skipped" } } }),
  );
  api.use("/auth", authRouter);
  api.use("/calls", callsRouter);
  api.use("/dashboard", dashboardRouter);
  app.use("/api/v1", api);

  // 404 & Error handlers (order matters — 404 before error handler)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
