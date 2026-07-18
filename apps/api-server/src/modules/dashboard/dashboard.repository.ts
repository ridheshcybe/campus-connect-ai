import { withTenant } from "../../lib/db";
import type { DashboardStats, Call } from "@campus/types";

/**
 * Queries database to aggregate dashboard statistics scoped to the current tenant.
 */
export async function getDashboardStats(tenantId: string): Promise<DashboardStats> {
  return withTenant(tenantId, async (tx) => {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [
      callsToday,
      unresolvedCalls,
      escalations,
      followUpsPending,
      recentRows,
    ] = await Promise.all([
      tx.calls.count({
        where: {
          tenantId,
          createdAt: { gte: startOfDay },
        },
      }),
      tx.calls.count({
        where: {
          tenantId,
          status: { not: "resolved" },
        },
      }),
      tx.calls.count({
        where: {
          tenantId,
          status: "escalated",
        },
      }),
      tx.calls.count({
        where: {
          tenantId,
          followUpRequired: true,
          status: { not: "resolved" },
        },
      }),
      tx.calls.findMany({
        where: { tenantId },
        orderBy: { startedAt: "desc" },
        take: 5,
      }),
    ]);

    const recentCalls: Call[] = recentRows.map((r) => ({
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

    return {
      callsToday,
      unresolvedCalls,
      escalations,
      followUpsPending,
      recentCalls,
    };
  });
}
