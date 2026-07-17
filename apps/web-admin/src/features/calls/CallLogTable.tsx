// apps/web-admin/src/features/calls/CallLogTable.tsx
import type { Call } from "@campus/types";
import { ISSUE_CATEGORY_LABELS, LANGUAGE_LABELS } from "@campus/config";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDuration, formatTime } from "../../lib/format";

export function CallLogTable({ calls }: { calls: Call[] }) {
  const navigate = useNavigate();

  if (calls.length === 0) {
    return <div className="p-8 text-center text-sm text-slate-500">No calls to show.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Caller</th>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Language</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {calls.map((call) => (
            <tr
              key={call.id}
              onClick={() => navigate(`/calls/${call.id}`)}
              className="cursor-pointer hover:bg-slate-50"
            >
              <td className="px-4 py-3 font-medium text-slate-800">{call.callerNumber}</td>
              <td className="px-4 py-3 text-slate-500">{formatTime(call.createdAt)}</td>
              <td className="px-4 py-3 text-slate-600">{LANGUAGE_LABELS[call.language]}</td>
              <td className="px-4 py-3 text-slate-600">
                {call.issueCategory ? ISSUE_CATEGORY_LABELS[call.issueCategory] : "—"}
              </td>
              <td className="px-4 py-3 text-slate-500">{formatDuration(call.durationSeconds)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={call.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
