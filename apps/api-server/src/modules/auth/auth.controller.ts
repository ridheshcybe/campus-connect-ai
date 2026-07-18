import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as authService from "./auth.service";
import { ValidationError } from "../../lib/errors";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  tenantSlug: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/** POST /api/v1/auth/login */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = LoginSchema.safeParse(req.body);
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
