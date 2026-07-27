"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  CreditCard,
  FolderKanban,
  LogOut,
  Moon,
  Plus,
  Sun,
  UserRound,
  Zap,
} from "lucide-react";
import { isPaidPlan } from "@/lib/stripe/plans";
import { BrandMark } from "../brand-mark";
import { WorkspaceSwitcher } from "../workspace-switcher";
import { useCreatorAuth } from "./creator-auth-provider";
import { useCreatorTheme } from "./creator-theme-provider";

const MAIN_NAV = [
  { href: "/create", label: "Create", icon: Plus },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
] as const;

export function CreatorSidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const { user, billing, signOut, authenticated } = useCreatorAuth();
  const { theme, toggleTheme } = useCreatorTheme();

  const isPaid = isPaidPlan(billing);
  const videosRemaining = billing?.videosRemaining ?? 3;

  function isActive(href: string) {
    return pathname === href || (href !== "/create" && pathname.startsWith(`${href}/`));
  }

  return (
    <aside
      id="sidebar-container"
      className="flex h-full w-64 flex-col border-r border-[#1e293b] bg-[#0b1329] text-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.15)]"
    >
      <div className="border-b border-[#1e293b] bg-[#070c1a] px-5 py-5">
        <Link href="/create" onClick={onCloseMobile} className="flex items-center gap-3">
          <BrandMark className="h-10 w-10" gradientId="creator-sidebar-mark" />
          <div>
            <p className="cp-display text-sm font-bold tracking-tight text-white">CrossPost</p>
            <p className="cp-label mt-0.5 text-[10px] tracking-[0.18em] text-indigo-300">
              Creator studio
            </p>
          </div>
        </Link>
      </div>

      <div className="border-b border-[#1e293b] bg-[#090f23] px-4 py-4">
        {authenticated ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white">
              {user?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (user?.name ?? "C").charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-white">{user?.name ?? "Creator"}</p>
                {isPaid ? (
                  <span className="rounded-md bg-indigo-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-200">
                    Pro
                  </span>
                ) : null}
              </div>
              <p className="truncate text-[11px] text-slate-400">
                {billing?.billingSource === "workspace_owner"
                  ? `Agency Pro · ${billing.workspaceName ?? "team"}`
                  : isPaid
                    ? "Pro · Unlimited"
                    : `${videosRemaining} videos left`}
              </p>
            </div>
            <button
              type="button"
              title="Sign out"
              onClick={() => void signOut()}
              className="rounded-xl border border-red-500/30 bg-red-500/15 p-2 text-red-300 transition-colors hover:bg-red-500/25"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Sign in to sync projects across devices.</p>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <div>
          <p className="cp-label mb-2 px-3 text-[10px] tracking-[0.16em] text-slate-500">
            Main
          </p>
          <div className="space-y-1">
            {MAIN_NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all ${
                    active
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={16} className={active ? "text-white" : "text-indigo-300/80"} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <p className="cp-label mb-2 px-3 text-[10px] tracking-[0.16em] text-slate-500">
            Account
          </p>
          <div className="space-y-2 px-1">
            <WorkspaceSwitcher />
            <Link
              href="/account"
              onClick={onCloseMobile}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all ${
                isActive("/account")
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <UserRound
                size={16}
                className={isActive("/account") ? "text-white" : "text-indigo-300/80"}
              />
              Account
            </Link>
          </div>
        </div>
      </nav>

      <div className="space-y-3 border-t border-[#1e293b] bg-[#070c1a] px-4 py-4">
        {!isPaid ? (
          <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-600/20 to-indigo-900/10 p-3">
            <p className="text-xs font-bold text-white">Pro Unlimited</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Remove the free-tier limit and remix without caps.
            </p>
            <Link
              href="/pricing"
              onClick={onCloseMobile}
              className="cp-btn cp-btn-accent mt-3 flex h-9 w-full text-xs"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              Go Pro
            </Link>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-300">
            CrossPost v1.0
          </p>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
