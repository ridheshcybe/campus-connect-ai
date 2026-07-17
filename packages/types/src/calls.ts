// packages/types/src/calls.ts
import { z } from "zod";
import { CALL_STATUSES, CHANNELS, ISSUE_CATEGORIES, LANGUAGES } from "./enums";
import { PaginationParamsSchema } from "./common";
import type { AiResponse, TranscriptTurn } from "./ai";

/** A call record as returned by the calls list (no transcript). Mirrors docs/data-model.md. */
export interface Call {
  id: string;
  tenantId: string;
  channel: (typeof CHANNELS)[number];
  callerNumber: string;
  language: (typeof LANGUAGES)[number];
  issueCategory: (typeof ISSUE_CATEGORIES)[number] | null;
  confidenceScore: number | null;
  status: (typeof CALL_STATUSES)[number];
  createdAt: string;
  durationSeconds: number | null;
}

/** Full detail for a single call. */
export interface CallDetail extends Call {
  turns: TranscriptTurn[];
  aiResponse: AiResponse | null;
  recordingUrl: string | null;
  summary: string | null;
}

/** Query params accepted by `GET /calls`. */
export const CallFiltersSchema = PaginationParamsSchema.extend({
  status: z.enum(CALL_STATUSES).optional(),
  category: z.enum(ISSUE_CATEGORIES).optional(),
  language: z.enum(LANGUAGES).optional(),
  channel: z.enum(CHANNELS).optional(),
  search: z.string().optional(),
});
export type CallFilters = z.infer<typeof CallFiltersSchema>;

/** Dashboard summary metrics. */
export interface DashboardStats {
  callsToday: number;
  unresolvedCalls: number;
  escalations: number;
  followUpsPending: number;
  recentCalls: Call[];
}
