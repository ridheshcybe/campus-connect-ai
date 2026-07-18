import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthenticatedError, ForbiddenError } from "../lib/errors";

/**
 * Enforces JWT Authentication. Verifies bearer token, decodes payload,
 * and attaches RequestContext to req.ctx.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthenticatedError("Authorization token required"));
  }

  const token = authHeader.split(" ")[1];
  if (!token) return next(new UnauthenticatedError("Malformed authorization header"));

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    if (!decoded.tenantId || !decoded.role) {
      return next(new UnauthenticatedError("Invalid token payload"));
    }

    req.ctx = {
      tenantId: decoded.tenantId,
      userId: decoded.userId || null,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return next(new UnauthenticatedError("Invalid or expired token"));
  }
}

/**
 * Enforces Internal Service Authentication using a static service token.
 * Extracts tenant context from the 'X-Tenant-Id' header and attaches RequestContext.
 */
export function requireServiceAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthenticatedError("Service token required"));
  }

  const token = authHeader.split(" ")[1];
  if (!token || token !== env.SERVICE_TOKEN) {
    return next(new ForbiddenError("Invalid service token"));
  }

  const tenantIdHeader = req.headers["x-tenant-id"];
  if (!tenantIdHeader || typeof tenantIdHeader !== "string") {
    return next(new UnauthenticatedError("X-Tenant-Id header required for internal calls"));
  }

  req.ctx = {
    tenantId: tenantIdHeader,
    userId: null,
    role: "admin",
  };
  next();
}
