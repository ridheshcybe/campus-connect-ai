import { Router } from "express";
import * as controller from "./auth.controller";
import { asyncHandler } from "../../lib/asyncHandler";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(controller.login));
authRouter.post("/refresh", asyncHandler(controller.refresh));
