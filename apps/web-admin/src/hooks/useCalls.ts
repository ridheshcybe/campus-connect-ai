// apps/web-admin/src/hooks/useCalls.ts
import { useQuery } from "@tanstack/react-query";
import type { CallFilters } from "@campus/types";
import { getCalls } from "../lib/api/calls";

export function useCalls(filters: Partial<CallFilters>) {
  return useQuery({
    queryKey: ["calls", filters],
    queryFn: () => getCalls(filters),
  });
}
