import "express";

export interface RequestContext {
  tenantId: string;
  userId: string | null;
  role: "super_admin" | "admin" | "viewer";
}

declare global {
  namespace Express {
    interface Request {
      ctx?: RequestContext;
    }
  }
}
