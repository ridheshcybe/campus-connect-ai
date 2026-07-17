// apps/web-admin/src/features/calls/CallDetailPage.tsx
import { Link, useParams } from "react-router-dom";
import { ISSUE_CATEGORY_LABELS, LANGUAGE_LABELS } from "@campus/config";
import { useCallDetail } from "../../hooks/useCallDetail";
import { StatusBadge } from "../../components/StatusBadge";
import { ErrorBlock, LoadingBlock } from "../../components/States";
import { formatConfidence, formatDuration, formatTime } from "../../lib/format";

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

export function CallDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error, refetch } = useCallDetail(id);

  return (
    <div className="space-y-4">
      <Link to="/calls" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        ← Back to Call Logs
      </Link>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <LoadingBlock />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50">
          <ErrorBlock message={(error as Error)?.message} onRetry={() => refetch()} />
        </div>
      ) : data ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">{data.callerNumber}</h2>
            <StatusBadge status={data.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
            <Meta label="Time" value={formatTime(data.createdAt)} />
            <Meta label="Language" value={LANGUAGE_LABELS[data.language]} />
            <Meta
              label="Category"
              value={data.issueCategory ? ISSUE_CATEGORY_LABELS[data.issueCategory] : "—"}
            />
            <Meta label="Duration" value={formatDuration(data.durationSeconds)} />
            <Meta label="Confidence" value={formatConfidence(data.confidenceScore)} />
            <Meta label="Channel" value={data.channel} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Transcript</h3>
            <div className="space-y-3">
              {data.turns.map((turn, i) => (
                <div key={i} className={`flex ${turn.role === "ai" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-lg rounded-2xl px-4 py-2 text-sm ${
                      turn.role === "ai" ? "bg-slate-100 text-slate-700" : "bg-brand-600 text-white"
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {data.summary ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-slate-800">AI Summary</h3>
              <p className="text-sm text-slate-600">{data.summary}</p>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
