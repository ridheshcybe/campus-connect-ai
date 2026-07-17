// apps/api-server/src/modules/calls/calls.service.ts
// Business logic for calls. In M0 it reads from mock data scoped to a single
// demo tenant; in M1 this becomes a repository call scoped by ctx.tenantId.
import type { Call, CallDetail, CallFilters, Paginated } from "@campus/types";
import { DEMO_TENANT_ID, MOCK_CALLS } from "../../lib/mock-data";
import { NotFoundError } from "../../lib/errors";

function forDemoTenant(): Call[] {
  return MOCK_CALLS.filter((c) => c.tenantId === DEMO_TENANT_ID);
}

export function listCalls(filters: CallFilters): Paginated<Call> {
  let rows = forDemoTenant();

  if (filters.status) rows = rows.filter((c) => c.status === filters.status);
  if (filters.category) rows = rows.filter((c) => c.issueCategory === filters.category);
  if (filters.language) rows = rows.filter((c) => c.language === filters.language);
  if (filters.channel) rows = rows.filter((c) => c.channel === filters.channel);
  if (filters.search) {
    const q = filters.search.replace(/\s+/g, "");
    rows = rows.filter((c) => c.callerNumber.replace(/\s+/g, "").includes(q));
  }

  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = rows.length;
  const { page, pageSize } = filters;
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return {
    data: pageRows,
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export function getCallById(id: string): CallDetail {
  const call = forDemoTenant().find((c) => c.id === id);
  if (!call) throw new NotFoundError(`Call ${id} not found`);
  return {
    ...call,
    turns: [
      { role: "ai", text: "Vanakkam, ABC College help desk. How can I help you?" },
      { role: "caller", text: "Fee payment deadline eppothu?" },
      { role: "ai", text: "The fee payment deadline for this semester is December 15th." },
    ],
    aiResponse:
      call.confidenceScore == null
        ? null
        : {
            answerText: "The fee payment deadline for this semester is December 15th.",
            confidenceScore: call.confidenceScore,
            issueCategory: call.issueCategory ?? "general",
            shouldEscalate: call.status === "escalated",
            language: call.language,
          },
    recordingUrl: null,
    summary: "Caller asked about the fee payment deadline; answered from the FAQ knowledge base.",
  };
}
