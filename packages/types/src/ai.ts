// packages/types/src/ai.ts
import { z } from "zod";
import { ISSUE_CATEGORIES, LANGUAGES } from "./enums";

/**
 * The structured answer produced by `POST /ai/answer`.
 * Produced by the LLM, validated here, persisted, and consumed by the
 * Orchestrator and web-admin. This is THE AI contract — see docs/ai-flow.md.
 */
export const AiResponseSchema = z.object({
  answerText: z.string().min(1),
  confidenceScore: z.number().min(0).max(1),
  issueCategory: z.enum(ISSUE_CATEGORIES),
  shouldEscalate: z.boolean(),
  language: z.enum(LANGUAGES),
});
export type AiResponse = z.infer<typeof AiResponseSchema>;

/** A single turn in a call transcript. */
export const TranscriptTurnSchema = z.object({
  role: z.enum(["caller", "ai"]),
  text: z.string(),
});
export type TranscriptTurn = z.infer<typeof TranscriptTurnSchema>;

/** Request body for `POST /ai/answer` (tenantId comes from the token, not the body). */
export const AiAnswerRequestSchema = z.object({
  callId: z.string(),
  language: z.enum(LANGUAGES),
  transcript: z.string().min(1),
  previousTurns: z.array(TranscriptTurnSchema).default([]),
});
export type AiAnswerRequest = z.infer<typeof AiAnswerRequestSchema>;
