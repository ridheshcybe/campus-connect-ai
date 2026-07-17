// apps/web-admin/src/lib/api/calls.ts
import type { Call, CallDetail, CallFilters, Paginated } from "@campus/types";
import { http } from "./client";

export function getCalls(filters: Partial<CallFilters>): Promise<Paginated<Call>> {
  return http.get<Paginated<Call>>("/calls", filters);
}

export async function getCallById(id: string): Promise<CallDetail> {
  const body = await http.get<{ data: CallDetail }>(`/calls/${id}`);
  return body.data;
}
