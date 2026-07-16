// apps/web-admin/src/features/calls/CallLogsPage.tsx

import { MainLayout } from "../../layouts/MainLayout";
import { CallLogTable } from "../../components/CallLogTable";

export function CallLogsPage() {
  return (
    <MainLayout>
      <div className="call-logs-page">
        <h2 className="call-logs-page__heading">Call Logs</h2>
        <CallLogTable />
      </div>
    </MainLayout>
  );
}
