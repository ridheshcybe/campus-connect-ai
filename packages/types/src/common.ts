// packages/types/src/common.ts
import { z } from "zod";

/** Standard success envelope: `{ data, meta? }`. */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

/** Standard error envelope: `{ error: { code, message, details? } }`. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
