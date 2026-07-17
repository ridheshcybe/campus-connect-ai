// apps/api-server/src/documents/index.ts

import { Router } from "express";
import { z } from "zod";
import { db, DocumentRecord } from "../db";
import { newId, nowIso } from "../utils/ids";
import { AppError } from "../utils/errors";

export const documentsRouter = Router();

const createDocumentSchema = z.object({
  tenantId: z.string().min(1),
  title: z.string().min(1),
  fileUrl: z.string().min(1),
});

// GET /documents?tenantId=&status=
documentsRouter.get("/", async (req, res) => {
  const { tenantId, status } = req.query;

  const query: Record<string, unknown> = {};
  if (tenantId) query.tenantId = tenantId;
  if (status) query.status = status;

  const documents = await db.documents.find<DocumentRecord>(query);
  res.json(documents);
});

// POST /documents
documentsRouter.post("/", async (req, res) => {
  const parsed = createDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const document = {
    id: newId(),
    ...parsed.data,
    status: "processing",
    uploadedAt: nowIso(),
  };

  const created = await db.documents.insert<DocumentRecord>(document);
  res.status(201).json(created);
});
