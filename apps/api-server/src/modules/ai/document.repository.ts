import { withTenant } from "../../lib/db";

export async function searchDocuments(
  tenantId: string,
  query: string
) {
  return withTenant(tenantId, async (tx) => {
    return tx.documentChunks.findMany({
      where: {
        tenantId,
        text: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 5,
    });
  });
}
