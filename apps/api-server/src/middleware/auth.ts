// apps/api-server/src/middleware/auth.ts
//
// Protects admin routes. Verifies the JWT issued by POST /auth/login and
// attaches { userId, tenantId, role } to req.auth so downstream routes can
// scope every DB query to req.auth.tenantId — this is the multi-tenant
// isolation rule from docs/architecture.md, enforced in one place instead
// of trusting each route to remember it.

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/errors";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or malformed Authorization header");
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.auth = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    next();
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}
