import { Request, Response, NextFunction } from "express";
import { UnauthenticatedError } from "../../lib/errors";
import * as dashboardRepo from "./dashboard.repository";

/** Extracts tenantId from req.ctx — throws if auth middleware was skipped. */
function mustGetCtx(req: Request) {
  if (!req.ctx) throw new UnauthenticatedError("Missing request context");
  return req.ctx;
}

/** GET /api/v1/dashboard/stats */
export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = mustGetCtx(req);
    const stats = await dashboardRepo.getDashboardStats(ctx.tenantId);
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
}
