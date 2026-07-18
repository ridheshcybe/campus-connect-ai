// apps/api-server/src/modules/calls/calls.service.ts
// Business logic for calls — backed by PostgreSQL via the calls repository.
import type { Call, CallDetail, CallFilters, Paginated } from "@campus/types";
import { NotFoundError } from "../../lib/errors";
import * as repo from "./calls.repository";

export async function listCalls(
  tenantId: string,
  filters: CallFilters
): Promise<Paginated<Call>> {
  return repo.listCalls(tenantId, filters);
}

export async function getCallById(
  tenantId: string,
  id: string
): Promise<CallDetail> {
  const call = await repo.getCallById(tenantId, id);
  if (!call) throw new NotFoundError(`Call ${id} not found`);
  return call;
}

export async function updateCall(
  tenantId: string,
  id: string,
  data: { status?: string; followUpRequired?: boolean }
) {
  const updated = await repo.updateCall(tenantId, id, data);
  if (!updated) throw new NotFoundError(`Call ${id} not found`);
  return updated;
}

/**
 * Generates a CSV string for all filtered calls (bypasses pagination — full result set).
 */
export async function exportCallsCsv(
  tenantId: string,
  filters: CallFilters
): Promise<string> {
  const result = await repo.listCalls(tenantId, { ...filters, page: 1, pageSize: 10000 });

  const header = [
    "id", "callerNumber", "channel", "status",
    "language", "issueCategory", "confidenceScore", "durationSeconds", "createdAt",
  ].join(",");

  const rows = result.data.map((c: Call) =>
    [
      c.id,
      `"${c.callerNumber}"`,
      c.channel,
      c.status,
      c.language,
      c.issueCategory ?? "",
      c.confidenceScore ?? "",
      c.durationSeconds ?? "",
      c.createdAt,
    ].join(",")
  );

  return [header, ...rows].join("\n");
}
