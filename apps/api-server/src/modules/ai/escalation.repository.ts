import { withTenant } from "../../lib/db";

export async function createEscalation(data: {
  tenantId: string;
  callId: string;
  reason: string;
}) {
  return withTenant(data.tenantId, async (tx) => {
    return tx.escalations.create({
      data: {
        tenantId: data.tenantId,
        callId: data.callId,
        reason: data.reason,
      },
    });
  });
}