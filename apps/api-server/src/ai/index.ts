// apps/api-server/src/ai/index.ts
//
// Task V3.3/V3.4: stub endpoint the Voice Orchestrator calls after ASR.
// Real logic (retrieval, LLM call, escalation rules) is owned by
// Tanishga & Surya — see docs/ai-voice-architecture.md. This returns a
// dummy AiResponse and logs every request/response for debugging.

import { Router } from "express";
import { AiResponse } from "../types/ai";

export const aiRouter = Router();

// POST /ai/answer  { transcript, tenantId, language, callId }
aiRouter.post("/answer", (req, res) => {
  const { transcript, tenantId, language, callId } = req.body;

  console.log("[ai/answer] incoming:", { transcript, tenantId, language, callId });

  const dummyResponse: AiResponse = {
    answerText: "This is a placeholder answer. Real AI integration pending.",
    confidenceScore: 0.5,
    issueCategory: "general",
    shouldEscalate: false,
    language: language ?? "en",
  };

  console.log("[ai/answer] responding:", dummyResponse);

  res.json(dummyResponse);
});
