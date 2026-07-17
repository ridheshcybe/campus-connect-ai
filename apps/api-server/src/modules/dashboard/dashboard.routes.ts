// apps/api-server/src/modules/dashboard/dashboard.routes.ts
import { Router, type Request, type Response } from "express";
import type { DashboardStats } from "@campus/types";
import { DEMO_TENANT_ID, MOCK_CALLS } from "../../lib/mock-data";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", (_req: Request, res: Response) => {
  const rows = MOCK_CALLS.filter((c) => c.tenantId === DEMO_TENANT_ID);
  const stats: DashboardStats = {
    callsToday: rows.length,
    unresolvedCalls: rows.filter((c) => c.status === "pending").length,
    escalations: rows.filter((c) => c.status === "escalated").length,
    followUpsPending: rows.filter((c) => c.status === "pending").length,
    recentCalls: [...rows]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
  };
  res.json({ data: stats });
});
