import { db, withTenant } from "../../lib/db";

export async function findTenantBySlug(slug: string) {
  return db.tenants.findUnique({ where: { slug } });
}

export async function findUserByEmailAndTenant(email: string, tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.users.findUnique({
      where: { tenantId_email: { tenantId, email } },
    }),
  );
}

export async function findUserById(id: string, tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.users.findFirst({
      where: { id, tenantId },
    }),
  );
}

export async function updateLastLogin(tenantId: string, id: string) {
  return withTenant(tenantId, (tx) =>
    tx.users.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    }),
  );
}

export async function createUser(data: {
  tenantId: string;
  email: string;
  passwordHash: string;
  role: string;
  name: string;
}) {
  return withTenant(data.tenantId, (tx) =>
    tx.users.create({
      data,
    }),
  );
}
