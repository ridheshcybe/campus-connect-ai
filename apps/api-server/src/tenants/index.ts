// apps/api-server/src/tenants/index.ts

import { Router } from "express";
import { z } from "zod";
import { db, Tenant } from "../db";
import { newId } from "../utils/ids";
import { AppError } from "../utils/errors";

export const tenantsRouter = Router();

const createTenantSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().min(1),
  defaultLang: z.string().default("en"),
});

// GET /tenants
tenantsRouter.get("/", async (_req, res) => {
  const tenants = await db.tenants.find<Tenant>({});
  res.json(tenants);
});

// GET /tenants/by-phone/:phoneNumber
// Used by telephony/index.ts to resolve which college owns an inbound number.
tenantsRouter.get("/by-phone/:phoneNumber", async (req, res) => {
  const tenant = await db.tenants.findOne<Tenant>({ phoneNumber: req.params.phoneNumber });
  if (!tenant) {
    throw new AppError(404, "No tenant registered for that phone number");
  }
  res.json(tenant);
});

// POST /tenants
tenantsRouter.post("/", async (req, res) => {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const tenant = { id: newId(), ...parsed.data };
  const created = await db.tenants.insert<Tenant>(tenant);
  res.status(201).json(created);
});
