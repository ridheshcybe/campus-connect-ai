// apps/web-admin/src/features/dashboard/DashboardPage.tsx

import { MainLayout } from "../../layouts/MainLayout";
import { StatsCard } from "../../components/StatsCard";

export function DashboardPage() {
  const metrics = [
    { title: "Calls Today", value: 47, variant: "default" as const },
    { title: "Unresolved Calls", value: 12, variant: "warning" as const },
    { title: "Escalations", value: 5, variant: "danger" as const },
    { title: "Follow-ups Pending", value: 8, variant: "warning" as const },
  ];

  return (
    <MainLayout>
      <div className="dashboard-page">
        <h2 className="dashboard-page__heading">Dashboard Overview</h2>
        <div className="dashboard-page__metrics">
          {metrics.map((m) => (
            <StatsCard key={m.title} title={m.title} value={m.value} variant={m.variant} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
