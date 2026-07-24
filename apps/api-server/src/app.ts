// apps/api-server/src/app.ts
// Express app factory (no listen here, so tests can import it).
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { callsRouter } from "./modules/calls/calls.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { aiRouter } from "./modules/ai/ai.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { asyncHandler } from "./lib/asyncHandler";
import { db } from "./lib/db";
import { redis } from "./lib/redis";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.WEB_ADMIN_ORIGIN }));
  app.use(express.json());

  // Liveness
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Versioned API
  const api = express.Router();
  api.get(
    "/ready",
    asyncHandler(async (_req, res) => {
      const checks = { db: "down", redis: "down" };
      try {
        await db.$queryRaw`SELECT 1`;
        checks.db = "ok";
      } catch {
        // Reported below; readiness should not crash the process.
      }
      try {
        if (redis.status === "wait") await redis.connect();
        await redis.ping();
        checks.redis = "ok";
      } catch {
        // Redis is required for reliable logout/token revocation.
      }

      const ready = checks.db === "ok";
      const status = ready ? (checks.redis === "ok" ? "ready" : "degraded") : "not_ready";
      res.status(ready ? 200 : 503).json({
        data: { status, checks },
      });
    }),
  );
  api.use("/auth", authRouter);
  api.use("/calls", callsRouter);
  api.use("/dashboard", dashboardRouter);
  api.use("/ai", aiRouter);
  app.use("/api/v1", api);

  // 404 & Error handlers (order matters — 404 before error handler)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
