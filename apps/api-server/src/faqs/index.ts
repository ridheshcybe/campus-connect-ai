// apps/api-server/src/faqs/index.ts

import { Router } from "express";
import { z } from "zod";
import { db, Faq } from "../db";
import { newId, nowIso } from "../utils/ids";
import { AppError } from "../utils/errors";

export const faqsRouter = Router();

const createFaqSchema = z.object({
  tenantId: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().default("general"),
  language: z.string().default("en"),
});

// GET /faqs?tenantId=&category=&language=&active=
faqsRouter.get("/", async (req, res) => {
  const { tenantId, category, language, active } = req.query;

  const query: Record<string, unknown> = {};
  if (tenantId) query.tenantId = tenantId;
  if (category) query.category = category;
  if (language) query.language = language;
  if (active !== undefined) query.active = active === "true";

  const faqs = await db.faqs.find<Faq>(query);
  res.json(faqs);
});

// POST /faqs
faqsRouter.post("/", async (req, res) => {
  const parsed = createFaqSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const faq = {
    id: newId(),
    ...parsed.data,
    active: true,
    createdAt: nowIso(),
  };

  const created = await db.faqs.insert<Faq>(faq);
  res.status(201).json(created);
});

// PATCH /faqs/:id
faqsRouter.patch("/:id", async (req, res) => {
  const updatedCount = await db.faqs.update({ id: req.params.id }, { $set: req.body });
  if (updatedCount === 0) {
    throw new AppError(404, "FAQ not found");
  }

  const updated = await db.faqs.findOne<Faq>({ id: req.params.id });
  res.json(updated);
});
