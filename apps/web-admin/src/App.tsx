// apps/web-admin/src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { CallLogsPage } from "./features/calls/CallLogsPage";
import { CallDetailPage } from "./features/calls/CallDetailPage";
import { PlaceholderPage } from "./components/PlaceholderPage";

export function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calls" element={<CallLogsPage />} />
        <Route path="/calls/:id" element={<CallDetailPage />} />
        <Route path="/faqs" element={<PlaceholderPage title="FAQ Manager" />} />
        <Route path="/documents" element={<PlaceholderPage title="Documents" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="*" element={<PlaceholderPage title="Page not found" />} />
      </Routes>
    </MainLayout>
  );
}
