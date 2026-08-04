import type { LoginRequest, LoginResponse } from "@campus/types";
import { getStoredAuth } from "../authStorage";
import { http } from "./client";

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await http.post<{ data: LoginResponse }>("/auth/login", credentials, false);
  return response.data;
}

export async function logout(): Promise<void> {
  const refreshToken = getStoredAuth()?.refreshToken;
  await http.post("/auth/logout", { refreshToken });
}
