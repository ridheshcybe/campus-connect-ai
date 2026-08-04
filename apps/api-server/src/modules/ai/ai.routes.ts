import { Router } from "express";
import * as controller from "./ai.controller";
import { requireServiceAuth } from "../../middleware/auth";
import { asyncHandler } from "../../lib/asyncHandler";

export const aiRouter = Router();

aiRouter.use(requireServiceAuth);

aiRouter.post("/answer", asyncHandler(controller.answer));
