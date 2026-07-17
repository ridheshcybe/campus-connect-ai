// apps/api-server/src/telephony/index.ts
//
// Task V3.1: receive inbound call webhooks from the telephony provider
// (Twilio). Resolves which tenant owns the called number by querying the
// Tenant collection — the actual mechanism docs/architecture.md describes
// under "Tenant identification strategy".

import { Router } from "express";
import { db, Tenant } from "../db";

export const telephonyRouter = Router();

// POST /telephony/inbound
telephonyRouter.post("/inbound", async (req, res) => {
  console.log("[telephony] inbound webhook payload:", req.body);

  const calledNumber = req.body?.To;
  const tenant = calledNumber
    ? await db.tenants.findOne<Tenant>({ phoneNumber: calledNumber })
    : null;

  if (!tenant) {
    console.warn(`[telephony] no tenant registered for number ${calledNumber}`);
    return res.status(200).json({ received: true, tenantResolved: false });
  }

  res.json({ received: true, tenantResolved: true, tenantId: tenant.id });
});
