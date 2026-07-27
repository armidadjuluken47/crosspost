"use client";

import { useState } from "react";
import { BrandLogo } from "./brand-logo";
import { Sidebar } from "./sidebar";

export function AppShell({
  children,
  openExceptionsCount,
  activeQueueCount,
  systemStatus,
}: {
  children: React.ReactNode;
  openExceptionsCount: number;
  activeQueueCount: number;
  systemStatus: "ok" | "degraded" | "error";
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div
        className="flex items-center justify-between border-b px-5 py-4 lg:hidden"
        style={{ borderColor: "var(--border)", background: "var(--sidebar-bg)" }}
      >
        <BrandLogo />
        <button type="button" className="btn-secondary" onClick={() => setMobileOpen(true)}>
          Menu
        </button>
      </div>

      <Sidebar
        openExceptionsCount={openExceptionsCount}
        activeQueueCount={activeQueueCount}
        systemStatus={systemStatus}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
