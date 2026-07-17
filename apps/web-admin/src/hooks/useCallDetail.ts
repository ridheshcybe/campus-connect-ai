// apps/web-admin/src/hooks/useCallDetail.ts
import { useQuery } from "@tanstack/react-query";
import { getCallById } from "../lib/api/calls";

export function useCallDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["call", id],
    queryFn: () => getCallById(id as string),
    enabled: Boolean(id),
  });
}
