import { z } from "zod";
import { USER_ROLES } from "./enums";

export const LoginRequestSchema = z.object({
  tenantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: (typeof USER_ROLES)[number];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
}
