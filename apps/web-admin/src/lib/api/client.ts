import type { ApiError, RefreshResponse } from "@campus/types";
import { clearStoredAuth, getStoredAuth, updateAccessToken } from "../authStorage";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  params?: Record<string, unknown>;
  body?: unknown;
  auth?: boolean;
  retryAfterRefresh?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const auth = getStoredAuth();
  if (!auth?.refreshToken) return null;

  const response = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: auth.refreshToken }),
  });
  if (!response.ok) return null;

  const body = (await response.json()) as { data: RefreshResponse };
  updateAccessToken(body.data.accessToken);
  return body.data.accessToken;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth !== false) {
    const accessToken = getStoredAuth()?.accessToken;
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (
    response.status === 401 &&
    options.auth !== false &&
    options.retryAfterRefresh !== false &&
    (await refreshAccessToken())
  ) {
    return request<T>(path, { ...options, retryAfterRefresh: false });
  }

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    if (response.status === 401 && options.auth !== false) clearStoredAuth();
    const error = (body as ApiError | null)?.error;
    throw new HttpError(
      response.status,
      error?.code ?? "UNKNOWN",
      error?.message ?? response.statusText,
    );
  }

  return body as T;
}

export const http = {
  get: <T>(path: string, params?: Record<string, unknown>) => request<T>(path, { params }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: "POST", body, auth }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
};
