"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  FileCode,
  FolderKanban,
  HeartPulse,
  History,
  AtSign,
  Layers,
  LogOut,
  Settings,
  Users,
  Video,
  CircleUser,
  BarChart3,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { BRAND } from "@/lib/brand";

const NAV = [
  { href: "/admin", label: "Overview", icon: Activity },
  { href: "/admin/users", label: "Creator Users", icon: Users },
  { href: "/admin/projects", label: "Creator Projects", icon: FolderKanban },
  { href: "/admin/usage", label: "Creator Usage", icon: BarChart3 },
  { href: "/admin/billing", label: "Billing", icon: DollarSign },
  { href: "/admin/models", label: "Model Registry", icon: CircleUser },
  { href: "/admin/sources", label: "Source Ingestion", icon: AtSign },
  { href: "/admin/prompts", label: "Prompt Operations", icon: FileCode },
  { href: "/admin/settings", label: "Engine Settings", icon: Settings },
  { href: "/admin/batch", label: "Batch Builder", icon: Layers },
  { href: "/admin/queue", label: "Queue & Runs", icon: Video, badgeKey: "queue" as const },
  { href: "/admin/exceptions", label: "Exception Center", icon: AlertTriangle, badgeKey: "exceptions" as const },
  { href: "/admin/audit", label: "System Audit Logs", icon: History },
];

export function Sidebar({
  openExceptionsCount,
  activeQueueCount,
  systemStatus,
  mobileOpen,
  onMobileClose,
}: {
  openExceptionsCount: number;
  activeQueueCount: number;
  systemStatus: "ok" | "degraded" | "error";
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  function badgeFor(key?: "queue" | "exceptions") {
    if (key === "queue" && activeQueueCount > 0) return activeQueueCount;
    if (key === "exceptions" && openExceptionsCount > 0) return openExceptionsCount;
    return null;
  }

  const statusLabel =
    systemStatus === "ok" ? "healthy" : systemStatus === "degraded" ? "degraded" : "offline";

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "var(--overlay)" }}
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
      >
        <div className="border-b p-5" style={{ borderColor: "var(--border)" }}>
          <BrandLogo />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <div className="px-2 pb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--text-faint)]">
            Operator Core
          </div>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            const badge = badgeFor(item.badgeKey);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-l-2 border-[#f487b7] bg-gradient-to-r from-[#f487b7]/15 via-[#c28e2e]/5 to-transparent text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                {badge != null ? (
                  <span
                    className={`badge ${item.badgeKey === "exceptions" ? "badge-error badge-pulse" : "badge-active"}`}
                  >
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t p-4" style={{ borderColor: "var(--border)" }}>
          <ThemeToggle />
          <div className="panel flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-secondary)]">
              <HeartPulse className="h-4 w-4" />
              Pipeline
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  systemStatus === "ok"
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    : systemStatus === "degraded"
                      ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                }`}
              />
              <span className="font-mono text-[10px] font-bold capitalize">{statusLabel}</span>
            </div>
          </div>
          <div className="flex justify-between px-1 font-mono text-[10px] text-[var(--text-faint)]">
            <span>{BRAND.name}</span>
            <span>v1.0.0</span>
          </div>
          <button
            type="button"
            className="btn-secondary flex w-full items-center justify-center gap-2 text-xs"
            disabled={loggingOut}
            onClick={logout}
          >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>
    </>
  );
}
