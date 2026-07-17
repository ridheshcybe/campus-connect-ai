// apps/api-server/src/types/express.d.ts
//
// Lets route handlers read req.auth after requireAuth middleware runs,
// with TypeScript checking it instead of treating req.auth as `any`.

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
