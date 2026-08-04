// apps/api-server/src/modules/calls/calls.controller.ts
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { CallFiltersSchema } from "@campus/types";
import { ValidationError, UnauthenticatedError } from "../../lib/errors";
import * as callsService from "./calls.service";

/** Extracts tenantId from req.ctx — throws if auth middleware was skipped. */
function mustGetCtx(req: Request) {
  if (!req.ctx) throw new UnauthenticatedError("Missing request context");
  return req.ctx;
}

/** GET /api/v1/calls */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = mustGetCtx(req);
    const parsed = CallFiltersSchema.safeParse(req.query);
    if (!parsed.success) return next(new ValidationError(parsed.error.flatten()));
    const result = await callsService.listCalls(ctx.tenantId, parsed.data);
    res.json({ data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/calls/export — streams CSV download */
export async function exportCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = mustGetCtx(req);
    const parsed = CallFiltersSchema.safeParse(req.query);
    if (!parsed.success) return next(new ValidationError(parsed.error.flatten()));
    const csv = await callsService.exportCallsCsv(ctx.tenantId, parsed.data);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="calls-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/calls/:id */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = mustGetCtx(req);
    const call = await callsService.getCallById(ctx.tenantId, req.params.id ?? "");
    res.json({ data: call });
  } catch (err) {
    next(err);
  }
}

const PatchSchema = z.object({
  status: z.enum(["in_progress", "resolved", "pending", "escalated"]).optional(),
  followUpRequired: z.boolean().optional(),
});

/** PATCH /api/v1/calls/:id */
export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = mustGetCtx(req);
    const parsed = PatchSchema.safeParse(req.body);
    if (!parsed.success) return next(new ValidationError(parsed.error.flatten()));
    const updated = await callsService.updateCall(ctx.tenantId, req.params.id ?? "", parsed.data);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
