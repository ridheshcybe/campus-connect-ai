import jwt from "jsonwebtoken";
import * as argon2 from "argon2";
import { env } from "../../config/env";
import * as authRepo from "./auth.repository";
import { UnauthenticatedError, NotFoundError } from "../../lib/errors";
import { db } from "../../lib/db";
import { redis } from "../../lib/redis";

/** Redis key prefix for blocklisted tokens */
const BLOCKLIST_PREFIX = "auth:blocklist:";

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: UserPayload;
}

/**
 * Verifies credentials, updates user login time, and issues JWT tokens.
 */
export async function login(
  tenantSlug: string,
  email: string,
  rawPassword: string
): Promise<LoginResult> {
  const tenant = await authRepo.findTenantBySlug(tenantSlug);
  if (!tenant) throw new UnauthenticatedError("Invalid credentials");

  const user = await authRepo.findUserByEmailAndTenant(email, tenant.id);
  if (!user) throw new UnauthenticatedError("Invalid credentials");

  const isPasswordValid = await argon2.verify(user.passwordHash, rawPassword);
  if (!isPasswordValid) throw new UnauthenticatedError("Invalid credentials");

  await db.users.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const payload = { userId: user.id, tenantId: user.tenantId, role: user.role };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
  // NOTE: No refresh_tokens table in schema; refresh tokens are self-contained JWTs.
  // Revocation requires a future migration to track active tokens.
  const refreshToken = jwt.sign({ ...payload, type: "refresh" }, env.JWT_SECRET, { expiresIn: "7d" });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
  };
}

/**
 * Validates a refresh token, checks blocklist, and issues a new access token.
 */
export async function refresh(token: string): Promise<{ accessToken: string }> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    if (decoded.type !== "refresh") throw new UnauthenticatedError("Invalid token type");

    // Reject if this refresh token has been blocklisted (logged out)
    const blocked = await redis.get(`${BLOCKLIST_PREFIX}${token}`);
    if (blocked) throw new UnauthenticatedError("Token has been revoked");

    const user = await authRepo.findUserById(decoded.userId);
    if (!user || user.tenantId !== decoded.tenantId) {
      throw new UnauthenticatedError("User no longer exists or tenant mismatch");
    }

    const payload = { userId: user.id, tenantId: user.tenantId, role: user.role };
    const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
    return { accessToken };
  } catch {
    throw new UnauthenticatedError("Invalid or expired refresh token");
  }
}

/**
 * Logout: adds both the access token and refresh token to the Redis blocklist.
 * Each key expires automatically when the token would have expired anyway.
 */
export async function logout(accessToken: string, refreshToken?: string): Promise<void> {
  const ops: Promise<any>[] = [];

  try {
    const decoded = jwt.decode(accessToken) as any;
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        ops.push(redis.set(`${BLOCKLIST_PREFIX}${accessToken}`, "1", "EX", ttl));
      }
    }
  } catch { /* ignore invalid token — logout is best-effort */ }

  if (refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken) as any;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          ops.push(redis.set(`${BLOCKLIST_PREFIX}${refreshToken}`, "1", "EX", ttl));
        }
      }
    } catch { /* ignore */ }
  }

  await Promise.all(ops);
}

/**
 * Returns true if the token is in the Redis blocklist.
 */
export async function isBlocklisted(token: string): Promise<boolean> {
  try {
    const result = await redis.get(`${BLOCKLIST_PREFIX}${token}`);
    return result !== null;
  } catch {
    return false; // Redis down — fail open (don't block legitimate requests)
  }
}

/**
 * Dev-only helper: creates a user for an existing tenant.
 */
export async function devRegister(
  tenantSlug: string,
  email: string,
  rawPassword: string,
  name: string,
  role: string
) {
  const tenant = await authRepo.findTenantBySlug(tenantSlug);
  if (!tenant) throw new NotFoundError(`Tenant slug '${tenantSlug}' not found`);

  const passwordHash = await argon2.hash(rawPassword, { type: argon2.argon2id });
  return authRepo.createUser({ tenantId: tenant.id, email, passwordHash, role, name });
}
