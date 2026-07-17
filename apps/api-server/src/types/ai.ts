// apps/api-server/src/types/ai.ts
//
// Mirrors the AiResponse contract from Tanishga/Surya's
// packages/types/src/ai.ts (see docs/ai-voice-architecture.md).
// Kept here too so the backend has its own copy to type against
// until/unless the repo introduces a real shared packages/types workspace.

export type AiResponse = {
  answerText: string;
  confidenceScore: number; // 0.0–1.0
  issueCategory: string; // e.g. "admission", "fees", "hostel"
  shouldEscalate: boolean;
  language: string; // "en" | "hi" | "ta" | "kn" | "te"
};
