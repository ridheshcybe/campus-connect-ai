import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as aiService from "./ai.service";
import {
  ValidationError,
  UnauthenticatedError,
} from "../../lib/errors";

const AnswerSchema = z.object({
  transcript: z.string().min(1),
  language: z.string().min(2),
  callId: z.string().min(1),
});

function mustGetCtx(req: Request) {
  if (!req.ctx)
    throw new UnauthenticatedError("Missing request context");

  return req.ctx;
}

export async function answer(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const ctx = mustGetCtx(req);

    const parsed = AnswerSchema.safeParse(req.body);

    if (!parsed.success) {
      return next(new ValidationError(parsed.error.flatten()));
    }

    const result = await aiService.generateAnswer(
      ctx.tenantId,
      parsed.data
    );

    res.json({
      data: result,
    });

  } catch (err) {
    next(err);
  }
}