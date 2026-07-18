// apps/api-server/src/modules/calls/calls.routes.ts
import { Router } from "express";
import * as controller from "./calls.controller";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../lib/asyncHandler";

export const callsRouter = Router();

// All calls routes require a valid JWT — requireAuth populates req.ctx
callsRouter.use(requireAuth);

// NOTE: /export MUST be registered before /:id to avoid Express treating 'export' as an ID
callsRouter.get("/export", asyncHandler(controller.exportCsv));
callsRouter.get("/", asyncHandler(controller.list));
callsRouter.get("/:id", asyncHandler(controller.getById));
callsRouter.patch("/:id", asyncHandler(controller.patch));
