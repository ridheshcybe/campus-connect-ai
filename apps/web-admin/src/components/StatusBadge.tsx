// apps/web-admin/src/components/StatusBadge.tsx
import type { CallStatus } from "@campus/types";
import { CALL_STATUS_LABELS } from "@campus/config";

const STYLES: Record<CallStatus, string> = {
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  escalated: "bg-red-50 text-red-700 ring-red-600/20",
  in_progress: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function StatusBadge({ status }: { status: CallStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {CALL_STATUS_LABELS[status]}
    </span>
  );
}
