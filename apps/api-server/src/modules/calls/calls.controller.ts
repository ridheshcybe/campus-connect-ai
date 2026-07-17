// apps/api-server/src/modules/calls/calls.controller.ts
import type { Request, Response, NextFunction } from "express";
import { CallFiltersSchema } from "@campus/types";
import { ValidationError } from "../../lib/errors";
import * as callsService from "./calls.service";

export function list(req: Request, res: Response, next: NextFunction) {
  const parsed = CallFiltersSchema.safeParse(req.query);
  if (!parsed.success) return next(new ValidationError(parsed.error.flatten()));
  const result = callsService.listCalls(parsed.data);
  res.json({ data: result.data, meta: result.meta });
}

export function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const call = callsService.getCallById(req.params.id ?? "");
    res.json({ data: call });
  } catch (err) {
    next(err);
  }
}
