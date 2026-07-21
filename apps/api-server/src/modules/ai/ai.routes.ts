import { Router } from "express";
import * as controller from "./ai.controller";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../lib/asyncHandler";

export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.post("/answer", asyncHandler(controller.answer));