// apps/web-admin/src/layouts/MainLayout.tsx
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Logo } from "../components/Logo";

const NAV = [
  { to: "/dashboard", label: "Dashboard", d: "M3 12l9-9 9 9M5 10v10h14V10" },
  { to: "/calls", label: "Calls", d: "M4 4h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 011-2z" },
  { to: "/faqs", label: "FAQs", d: "M12 18h.01M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M4 5h16v14H4z" },
  { to: "/documents", label: "Documents", d: "M7 3h7l5 5v13H7zM14 3v5h5" },
  { to: "/settings", label: "Settings", d: "M10.3 3h3.4l.5 2.4 2.1 1.2 2.3-.8 1.7 2.9-1.8 1.6v2.4l1.8 1.6-1.7 2.9-2.3-.8-2.1 1.2-.5 2.4h-3.4l-.5-2.4-2.1-1.2-2.3.8L1.9 15l1.8-1.6v-2.4L1.9 9.4 3.6 6.5l2.3.8 2.1-1.2z" },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/calls": "Call Logs",
  "/faqs": "FAQ Manager",
  "/documents": "Documents",
  "/settings": "Settings",
};

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function MainLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const title =
    Object.entries(TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? "Admin";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 md:flex">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <Logo className="h-9 w-9 shrink-0" />
          <span className="text-base font-semibold text-white">CampusConnect AI</span>
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon d={item.d} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-6 py-4 text-xs text-slate-500">
          MVP · Milestone M0
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">Demo Admin</p>
              <p className="text-xs text-slate-400">ABC College</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              DA
            </span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
