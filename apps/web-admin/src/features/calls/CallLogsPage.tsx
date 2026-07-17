// apps/web-admin/src/features/calls/CallLogsPage.tsx
import { useState } from "react";
import { CALL_STATUSES, type CallStatus } from "@campus/types";
import { CALL_STATUS_LABELS } from "@campus/config";
import { useCalls } from "../../hooks/useCalls";
import { CallLogTable } from "./CallLogTable";
import { ErrorBlock, LoadingBlock } from "../../components/States";

export function CallLogsPage() {
  const [status, setStatus] = useState<CallStatus | "">("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useCalls({
    status: status || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Call Logs</h2>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search caller number…"
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CallStatus | "")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All statuses</option>
          {CALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CALL_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {data ? <span className="text-sm text-slate-500">{data.meta.total} call(s)</span> : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <ErrorBlock message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : (
          <CallLogTable calls={data?.data ?? []} />
        )}
      </div>
    </div>
  );
}
