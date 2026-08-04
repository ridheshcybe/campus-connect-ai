import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { LoginRequestSchema } from "@campus/types";
import * as authService from "./auth.service";
import { ValidationError } from "../../lib/errors";

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/** POST /api/v1/auth/login */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) return next(new ValidationError(parsed.error.flatten()));

    const { tenantSlug, email, password } = parsed.data;
    const result = await authService.login(tenantSlug, email, password);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/auth/refresh */
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = RefreshSchema.safeParse(req.body);
    if (!parsed.success) return next(new ValidationError(parsed.error.flatten()));

    const result = await authService.refresh(parsed.data.refreshToken);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/auth/logout */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ") ? (authHeader.split(" ")[1] ?? "") : "";

    const { refreshToken } = req.body as { refreshToken?: string };
    await authService.logout(accessToken, refreshToken);
    res.json({ data: { message: "Logged out successfully" } });
  } catch (err) {
    next(err);
  }
}
