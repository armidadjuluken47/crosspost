"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { WorkspaceSwitcher } from "../workspace-switcher";
import { useCreatorAuth } from "./creator-auth-provider";

const NAV = [
  { href: "/create", label: "Create" },
  { href: "/discover", label: "Discover" },
  { href: "/projects", label: "Projects" },
  { href: "/pricing", label: "Pricing" },
  { href: "/account", label: "Account" },
] as const;

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/create"
      className={`flex items-center gap-2.5 transition-transform duration-150 active:scale-[0.98] ${className}`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900">
        <div className="h-2.5 w-2.5 rotate-45 border-2 border-white bg-zinc-900" />
      </div>
      <span className="cp-display text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
        CrossPost
      </span>
    </Link>
  );
}

export function CreatorHeader({ onOpenAuth }: { onOpenAuth?: () => void }) {
  const pathname = usePathname();
  const { user, billing, signOut, authenticated } = useCreatorAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isPaid =
    Boolean(billing?.unlimited) ||
    billing?.plan === "monthly" ||
    billing?.plan === "yearly" ||
    billing?.videosRemaining === -1;
  const videosRemaining = billing?.videosRemaining ?? 3;

  function isActive(href: string) {
    return pathname === href || (href !== "/create" && pathname.startsWith(`${href}/`));
  }

  return (
    <header className="animate-header-in sticky top-0 z-40 w-full border-b border-zinc-200 bg-[#f4f4f5]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <BrandMark />

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "text-zinc-900 after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:bg-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <WorkspaceSwitcher />
          {authenticated ? (
            <>
              <Link
                href="/pricing"
                className="hidden text-xs font-semibold text-[#6B6560] transition-colors hover:text-[#0B0B0B] sm:block"
              >
                {isPaid ? (
                  <span>
                    Pro · <span className="text-[#0F7A4C]">Unlimited</span>
                  </span>
                ) : (
                  <span>
                    {videosRemaining} <span className="font-medium text-[#6B6560]">left</span>
                  </span>
                )}
              </Link>

              <Link
                href="/account"
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#0B0B0B] text-sm font-semibold text-white"
              >
                {user?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  (user?.name ?? "C").charAt(0).toUpperCase()
                )}
              </Link>

              <button
                type="button"
                onClick={() => signOut()}
                title="Sign out"
                className="hidden rounded-2xl p-2 text-[#6B6560] transition-colors hover:bg-[#E11D48]/10 hover:text-[#E11D48] sm:inline-flex"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button type="button" onClick={onOpenAuth} className="cp-btn hidden sm:inline-flex">
              Sign in
            </button>
          )}

          <button
            type="button"
            className="inline-flex rounded-2xl border border-[#E7E2DA] bg-[#FFFCF7] p-2 text-[#0B0B0B] md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="animate-fade-in border-t border-[#E7E2DA] bg-[#FFFCF7] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  isActive(item.href)
                    ? "bg-[#0B0B0B] text-white"
                    : "text-[#6B6560] hover:bg-black/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {!authenticated && onOpenAuth ? (
              <button
                type="button"
                className="cp-btn mt-2 w-full"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAuth();
                }}
              >
                Sign in
              </button>
            ) : null}
            {authenticated ? (
              <button
                type="button"
                className="mt-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#E11D48]"
                onClick={() => {
                  setMenuOpen(false);
                  void signOut();
                }}
              >
                Sign out
              </button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
