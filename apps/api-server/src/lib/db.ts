import { PrismaClient, Prisma } from "@prisma/client";

export const db = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

/**
 * Executes a transactional query within the context of a specific tenant.
 * Sets 'app.tenant_id' locally within the transaction to satisfy DB Row-Level Security (RLS).
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    // Using set_config with parameterized tag to avoid SQL injection
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
