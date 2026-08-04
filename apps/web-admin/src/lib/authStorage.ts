import type { AuthUser, LoginResponse } from "@campus/types";

const STORAGE_KEY = "campus-connect-auth";

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function getStoredAuth(): StoredAuth | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function storeAuth(value: LoginResponse | StoredAuth): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("campus-auth-updated"));
}

export function updateAccessToken(accessToken: string): void {
  const current = getStoredAuth();
  if (current) storeAuth({ ...current, accessToken });
}

export function clearStoredAuth(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("campus-auth-updated"));
}
