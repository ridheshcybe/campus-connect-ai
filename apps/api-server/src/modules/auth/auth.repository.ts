import { db } from "../../lib/db";

export async function findTenantBySlug(slug: string) {
  return db.tenants.findUnique({ where: { slug } });
}

export async function findUserByEmailAndTenant(email: string, tenantId: string) {
  return db.users.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
}

export async function findUserById(id: string) {
  return db.users.findUnique({ where: { id } });
}

export async function createUser(data: {
  tenantId: string;
  email: string;
  passwordHash: string;
  role: string;
  name: string;
}) {
  return db.users.create({ data });
}
