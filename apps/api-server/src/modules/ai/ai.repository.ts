import type { AiResponse } from "@campus/types";
import { withTenant } from "../../lib/db";

export async function findCallById(tenantId: string, callId: string) {
  return withTenant(tenantId, (tx) => tx.calls.findFirst({ where: { id: callId, tenantId } }));
}

export async function loadAnswerContext(tenantId: string, callId: string) {
  return withTenant(tenantId, async (tx) => {
    const [history, faqs, chunks] = await Promise.all([
      tx.transcriptTurns.findMany({
        where: { tenantId, callId },
        orderBy: { turnIndex: "asc" },
        take: 20,
      }),
      tx.faqs.findMany({
        where: { tenantId },
        select: { question: true, answer: true, category: true, language: true },
        take: 100,
      }),
      tx.documentChunks.findMany({
        where: { tenantId },
        select: { text: true, document: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    return { history, faqs, chunks };
  });
}

export async function persistAnswer(data: {
  tenantId: string;
  callId: string;
  transcript: string;
  response: AiResponse;
  escalationReason?: string;
}) {
  return withTenant(data.tenantId, async (tx) => {
    const latest = await tx.transcriptTurns.findFirst({
      where: { tenantId: data.tenantId, callId: data.callId },
      orderBy: { turnIndex: "desc" },
    });
    const callerTurnIndex = (latest?.turnIndex ?? -1) + 1;
    const aiTurnIndex = callerTurnIndex + 1;

    await tx.transcriptTurns.create({
      data: {
        tenantId: data.tenantId,
        callId: data.callId,
        turnIndex: callerTurnIndex,
        role: "caller",
        text: data.transcript,
      },
    });

    await tx.transcriptTurns.create({
      data: {
        tenantId: data.tenantId,
        callId: data.callId,
        turnIndex: aiTurnIndex,
        role: "ai",
        text: data.response.answerText,
      },
    });

    await tx.aiResponses.create({
      data: {
        tenantId: data.tenantId,
        callId: data.callId,
        turnIndex: aiTurnIndex,
        answerText: data.response.answerText,
        confidenceScore: data.response.confidenceScore,
        issueCategory: data.response.issueCategory,
        shouldEscalate: data.response.shouldEscalate,
        language: data.response.language,
      },
    });

    if (data.response.shouldEscalate) {
      await tx.escalations.create({
        data: {
          tenantId: data.tenantId,
          callId: data.callId,
          reason: data.escalationReason ?? "AI requested human assistance",
        },
      });
      await tx.calls.update({
        where: { id: data.callId },
        data: { status: "escalated", followUpRequired: true },
      });
    }
  });
}
