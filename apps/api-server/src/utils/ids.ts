// apps/api-server/src/utils/ids.ts

import { randomUUID } from "crypto";

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
