"use client";

import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { isPaidPlan } from "@/lib/stripe/plans";
import { useCreatorAuth } from "./creator-auth-provider";

export function CreatorTopbar({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { user, billing, authenticated, signInWithGoogle } = useCreatorAuth();

  const isPaid = isPaidPlan(billing);

  return (
    <header className="cp-topbar sm:gap-4 sm:px-4">
      <button
        type="button"
        onClick={onOpenMenu}
        className="inline-flex rounded-xl border border-cp-line bg-cp-bg p-2 text-cp-muted transition-colors hover:text-cp-ink lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <Link
        href="/discover"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-cp-line bg-cp-bg/80 px-3 py-2.5 text-xs text-cp-muted transition-colors hover:border-indigo-200 hover:bg-white hover:text-cp-accent dark:hover:border-indigo-400/40 dark:hover:bg-[#0f1729]"
      >
        <Search size={14} className="shrink-0" />
        <span className="truncate">Search discovery…</span>
        <kbd className="ml-auto hidden rounded border border-cp-line bg-white dark:bg-[#0f1729] px-1.5 py-0.5 font-mono text-[9px] text-cp-muted/80 sm:inline">
          ⌘K
        </kbd>
      </Link>

      {authenticated ? (
        <Link
          href="/pricing"
          className="hidden rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-700 sm:inline-flex dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-300"
        >
          {isPaid ? "Pro" : `${billing?.videosRemaining ?? 3} left`}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="cp-btn h-9 px-3 text-xs"
        >
          Sign in
        </button>
      )}

      <Link
        href="/account"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-indigo-200/60 bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-sm"
      >
        {user?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          (user?.name ?? "C").charAt(0).toUpperCase()
        )}
      </Link>
    </header>
  );
}
