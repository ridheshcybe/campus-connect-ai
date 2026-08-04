import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { PlaceholderPage } from "./components/PlaceholderPage";
import { LoginPage } from "./features/auth/LoginPage";
import { CallDetailPage } from "./features/calls/CallDetailPage";
import { CallLogsPage } from "./features/calls/CallLogsPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { MainLayout } from "./layouts/MainLayout";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/calls" element={<CallLogsPage />} />
          <Route path="/calls/:id" element={<CallDetailPage />} />
          <Route path="/faqs" element={<PlaceholderPage title="FAQ Manager" />} />
          <Route path="/documents" element={<PlaceholderPage title="Documents" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
