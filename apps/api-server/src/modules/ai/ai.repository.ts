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