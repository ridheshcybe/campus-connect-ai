// apps/api-server/src/calls/index.ts
//
// Implements the "Call APIs" section of docs/api-spec.md.

import { Router } from "express";
import { z } from "zod";
import { db, Call } from "../db";
import { newId, nowIso } from "../utils/ids";
import { AppError } from "../utils/errors";

export const callsRouter = Router();

const createCallSchema = z.object({
  tenantId: z.string().min(1),
  callerNumber: z.string().min(1),
  language: z.string().default("en"),
  issueCategory: z.string().default("other"),
  status: z.enum(["pending", "resolved", "escalated"]).default("pending"),
  transcriptText: z.string().optional(),
});

const followupSchema = z.object({
  channel: z.enum(["sms", "whatsapp", "call"]),
  scheduledAt: z.string().optional(),
});

// GET /calls?tenantId=&status=&issueCategory=
callsRouter.get("/", async (req, res) => {
  const { tenantId, status, issueCategory } = req.query;

  const query: Record<string, unknown> = {};
  if (tenantId) query.tenantId = tenantId;
  if (status) query.status = status;
  if (issueCategory) query.issueCategory = issueCategory;

  const calls = await db.calls.find<Call>(query);
  res.json(calls);
});

// GET /calls/:id
callsRouter.get("/:id", async (req, res) => {
  const call = await db.calls.findOne<Call>({ id: req.params.id });
  if (!call) {
    throw new AppError(404, "Call not found");
  }
  res.json(call);
});

// POST /calls  — orchestrator persists a finished call
callsRouter.post("/", async (req, res) => {
  const parsed = createCallSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const now = nowIso();
  const call = {
    id: newId(),
    ...parsed.data,
    escalated: parsed.data.status === "escalated",
    createdAt: now,
    updatedAt: now,
  };

  const created = await db.calls.insert<Call>(call);
  res.status(201).json(created);
});

// PATCH /calls/:id/status  — admin UI "Mark as resolved" button
callsRouter.patch("/:id/status", async (req, res) => {
  const status = req.body?.status;
  if (!status) {
    throw new AppError(400, "status is required");
  }

  const updatedCount = await db.calls.update(
    { id: req.params.id },
    { $set: { status, updatedAt: nowIso() } }
  );

  if (updatedCount === 0) {
    throw new AppError(404, "Call not found");
  }

  const updated = await db.calls.findOne<Call>({ id: req.params.id });
  res.json(updated);
});

// POST /calls/:id/followup  — schedule a follow-up for a call
callsRouter.post("/:id/followup", async (req, res) => {
  const parsed = followupSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const call = await db.calls.findOne<Call>({ id: req.params.id });
  if (!call) {
    throw new AppError(404, "Call not found");
  }

  const followup = {
    id: newId(),
    callId: call.id,
    tenantId: call.tenantId,
    channel: parsed.data.channel,
    status: "pending",
    scheduledAt: parsed.data.scheduledAt ?? nowIso(),
  };

  const created = await db.followups.insert(followup);
  res.status(201).json(created);
});
