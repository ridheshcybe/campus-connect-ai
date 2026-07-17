// apps/api-server/src/notifications/index.ts
//
// Task V3.2: trigger outbound follow-ups. Called by the Worker once it
// decides a follow-up is due. Actually dispatching the SMS/WhatsApp/call is
// out of scope for now — this records that it was requested.

import { Router } from "express";
import { z } from "zod";
import { db, Call } from "../db";
import { AppError } from "../utils/errors";

export const notificationsRouter = Router();

const followupNotificationSchema = z.object({
  callId: z.string().min(1),
  channel: z.enum(["sms", "whatsapp", "call"]),
});

// POST /notifications/followups
notificationsRouter.post("/followups", async (req, res) => {
  const parsed = followupNotificationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }
  const { callId, channel } = parsed.data;

  const call = await db.calls.findOne<Call>({ id: callId });
  if (!call) {
    throw new AppError(404, "Call not found");
  }

  // TODO: actually dispatch via Twilio once that integration exists.
  console.log(`[notifications] would send ${channel} follow-up for call ${callId}`);

  res.status(202).json({ callId, channel, status: "queued" });
});
