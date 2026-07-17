// apps/web-admin/src/features/dashboard/DashboardPage.tsx
import { Link } from "react-router-dom";
import { useDashboardStats } from "../../hooks/useDashboardStats";
import { StatsCard } from "../../components/StatsCard";
import { ErrorBlock, LoadingBlock } from "../../components/States";
import { CallLogTable } from "../calls/CallLogTable";

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Dashboard Overview</h2>
        <p className="text-sm text-slate-500">A live snapshot of your college help desk.</p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <LoadingBlock label="Loading metrics…" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50">
          <ErrorBlock message={(error as Error)?.message} onRetry={() => refetch()} />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Calls Today" value={data.callsToday} />
            <StatsCard title="Unresolved Calls" value={data.unresolvedCalls} tone="warning" />
            <StatsCard title="Escalations" value={data.escalations} tone="danger" />
            <StatsCard title="Follow-ups Pending" value={data.followUpsPending} tone="warning" />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">Recent Calls</h3>
              <Link
                to="/calls"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View all →
              </Link>
            </div>
            <CallLogTable calls={data.recentCalls} />
          </section>
        </>
      ) : null}
    </div>
  );
}
