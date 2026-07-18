// apps/api-server/src/modules/dashboard/dashboard.routes.ts
import { Router } from "express";
import * as controller from "./dashboard.controller";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../lib/asyncHandler";

export const dashboardRouter = Router();

// Guard dashboard stats with JWT Auth
dashboardRouter.use(requireAuth);

dashboardRouter.get("/stats", asyncHandler(controller.getStats));
