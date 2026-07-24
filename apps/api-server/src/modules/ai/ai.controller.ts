import type { NextFunction, Request, Response } from "express";
import { AiAnswerRequestSchema } from "@campus/types";
import { UnauthenticatedError, ValidationError } from "../../lib/errors";
import * as aiService from "./ai.service";

export async function answer(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.ctx) throw new UnauthenticatedError("Missing request context");
    const parsed = AiAnswerRequestSchema.safeParse(req.body);
    if (!parsed.success) return next(new ValidationError(parsed.error.flatten()));

    const result = await aiService.generateAnswer(req.ctx.tenantId, parsed.data);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}
