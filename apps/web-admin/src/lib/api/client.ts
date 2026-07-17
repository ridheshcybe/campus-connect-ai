// apps/web-admin/src/lib/api/client.ts
// Transport layer. The ONLY place that talks HTTP. Components never call fetch.
import type { ApiError } from "@campus/types";

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

async function request<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" },
  });

  const body = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const err = (body as ApiError | null)?.error;
    throw new HttpError(res.status, err?.code ?? "UNKNOWN", err?.message ?? res.statusText);
  }

  return body as T;
}

export const http = {
  get: <T>(path: string, params?: Record<string, unknown>) => request<T>(path, params),
};
