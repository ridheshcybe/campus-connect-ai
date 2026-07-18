import { Router } from "express";
import * as controller from "./auth.controller";
import { asyncHandler } from "../../lib/asyncHandler";

export const authRouter = Router();

authRouter.post("/login", asyncHandler(controller.login));
authRouter.post("/refresh", asyncHandler(controller.refresh));
// Logout doesn't require requireAuth — it works even with an expired/invalid token
authRouter.post("/logout", asyncHandler(controller.logout));
