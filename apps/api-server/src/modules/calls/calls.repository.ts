import { Prisma } from "@prisma/client";
import { withTenant } from "../../lib/db";
import type { Call, CallDetail, CallFilters, Paginated } from "@campus/types";

/**
 * Lists calls with filters, pagination, sorted by startedAt DESC.
 */
export async function listCalls(
  tenantId: string,
  filters: CallFilters
): Promise<Paginated<Call>> {
  return withTenant(tenantId, async (tx) => {
    const { page = 1, pageSize = 25, status, category, language, channel, search } = filters;

    const where: Prisma.CallsWhereInput = { tenantId };
    if (status) where.status = status;
    if (category) where.issueCategory = category;
    if (language) where.language = language;
    if (channel) where.channel = channel;
    if (search) where.callerNumber = { contains: search, mode: "insensitive" };

    const total = await tx.calls.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const rows = await tx.calls.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const data: Call[] = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      channel: r.channel as any,
      callerNumber: r.callerNumber,
      language: r.language as any,
      issueCategory: r.issueCategory as any,
      confidenceScore: r.confidenceScore ? Number(r.confidenceScore) : null,
      status: r.status as any,
      createdAt: r.createdAt.toISOString(),
      durationSeconds: r.durationSeconds,
    }));

    return { data, meta: { page, pageSize, total, totalPages } };
  });
}

/**
 * Retrieves full call detail by ID including turns and latest AI response.
 */
export async function getCallById(
  tenantId: string,
  id: string
): Promise<CallDetail | null> {
  return withTenant(tenantId, async (tx) => {
    const call = await tx.calls.findFirst({
      where: { id, tenantId },
      include: {
        turns: { orderBy: { turnIndex: "asc" } },
        aiResponses: { orderBy: { turnIndex: "desc" }, take: 1 },
      },
    });

    if (!call) return null;

    const latestAi = call.aiResponses[0] ?? null;

    return {
      id: call.id,
      tenantId: call.tenantId,
      channel: call.channel as any,
      callerNumber: call.callerNumber,
      language: call.language as any,
      issueCategory: call.issueCategory as any,
      confidenceScore: call.confidenceScore ? Number(call.confidenceScore) : null,
      status: call.status as any,
      createdAt: call.createdAt.toISOString(),
      durationSeconds: call.durationSeconds,
      turns: call.turns.map((t) => ({ role: t.role as any, text: t.text })),
      aiResponse: latestAi
        ? {
            answerText: latestAi.answerText,
            confidenceScore: Number(latestAi.confidenceScore),
            issueCategory: latestAi.issueCategory as any,
            shouldEscalate: latestAi.shouldEscalate,
            language: latestAi.language as any,
          }
        : null,
      recordingUrl: call.recordingKey
        ? `https://storage.campusconnect.ai/${call.recordingKey}`
        : null,
      summary: call.summary,
    };
  });
}

/**
 * Updates call status or followUpRequired. Returns null if not found in tenant scope.
 */
export async function updateCall(
  tenantId: string,
  id: string,
  data: { status?: string; followUpRequired?: boolean }
) {
  return withTenant(tenantId, async (tx) => {
    const call = await tx.calls.findFirst({ where: { id, tenantId } });
    if (!call) return null;

    return tx.calls.update({
      where: { id },
      data: { status: data.status, followUpRequired: data.followUpRequired },
    });
  });
}
