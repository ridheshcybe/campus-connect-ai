// apps/web-admin/src/lib/api/dashboard.ts
import type { DashboardStats } from "@campus/types";
import { http } from "./client";

export async function getDashboardStats(): Promise<DashboardStats> {
  const body = await http.get<{ data: DashboardStats }>("/dashboard/stats");
  return body.data;
}
