// apps/web-admin/src/layouts/MainLayout.tsx

import type { ReactNode } from "react";

const navItems = [
  { label: "Dashboard", href: "#dashboard" },
  { label: "Calls", href: "#calls" },
  { label: "FAQs", href: "#faqs" },
  { label: "Documents", href: "#documents" },
  { label: "Settings", href: "#settings" },
];

export interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="main-layout">
      {/* ---- Sidebar ---- */}
      <aside className="main-layout__sidebar">
        <div className="main-layout__logo">CampusConnect AI</div>
        <nav className="main-layout__nav">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className="main-layout__nav-link">
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* ---- Main area ---- */}
      <div className="main-layout__main">
        <header className="main-layout__header">
          <h1 className="main-layout__header-title">Admin Dashboard</h1>
          <div className="main-layout__header-user">Admin User</div>
        </header>
        <main className="main-layout__content">{children}</main>
      </div>
    </div>
  );
}
