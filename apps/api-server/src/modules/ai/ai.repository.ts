import { withTenant } from "../../lib/db";

export async function findCallById(
  tenantId: string,
  callId: string
) {
  return withTenant(tenantId, async (tx) => {
    return tx.calls.findFirst({
      where: {
        id: callId,
        tenantId,
      },
    });
  });
}

export async function saveAiResponse(data: {
  tenantId: string;
  callId: string;
  turnIndex: number;
  answerText: string;
  confidenceScore: number;
  issueCategory: string | null;
  shouldEscalate: boolean;
  language: string;
}) {
  return withTenant(data.tenantId, async (tx) => {
    return tx.aiResponses.create({
      data: {
        tenantId: data.tenantId,
        callId: data.callId,
        turnIndex: data.turnIndex,
        answerText: data.answerText,
        confidenceScore: data.confidenceScore,
        issueCategory: data.issueCategory,
        shouldEscalate: data.shouldEscalate,
        language: data.language,
      },
    });
  });
}


export async function getNextTurnIndex(
  tenantId: string,
  callId: string
) {
  return withTenant(tenantId, async (tx) => {
    const latest = await tx.aiResponses.findFirst({
      where: {
        tenantId,
        callId,
      },
      orderBy: {
        turnIndex: "desc",
      },
    });

    return latest ? latest.turnIndex + 1 : 1;
  });
}

export async function getConversationHistory(
  tenantId: string,
  callId: string
) {
  return withTenant(tenantId, async (tx) => {
    return tx.transcriptTurns.findMany({
      where: {
        tenantId,
        callId,
      },
      orderBy: {
        turnIndex: "asc",
      },
    });
  });
}

export async function saveTranscriptTurn(data: {
  tenantId: string;
  callId: string;
  turnIndex: number;
  role: string;
  text: string;
}) {
  return withTenant(data.tenantId, async (tx) => {
    return tx.transcriptTurns.create({
      data: {
        tenantId: data.tenantId,
        callId: data.callId,
        turnIndex: data.turnIndex,
        role: data.role,
        text: data.text,
      },
    });
  });
}

export async function searchKnowledgeBase(
  tenantId: string,
  query: string
) {
  return withTenant(tenantId, async (tx) => {
    return tx.faqs.findMany({
      where: {
        tenantId,
        OR: [
          {
            question: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            answer: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      take: 5,
    });
  });
}

