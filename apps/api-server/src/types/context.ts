import "express";

export interface RequestContext {
  tenantId: string;
  userId: string | null;
  role: "super_admin" | "admin" | "viewer" | "service";
}

declare global {
  namespace Express {
    interface Request {
      ctx?: RequestContext;
    }
  }
}
