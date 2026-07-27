"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { CreatorSidebar } from "./creator-sidebar";
import { CreatorTopbar } from "./creator-topbar";
import { CreatorToastProvider } from "./creator-toast";
import { CreatorAuthProvider, useCreatorAuth } from "./creator-auth-provider";
import { CreatorThemeProvider, useCreatorTheme } from "./creator-theme-provider";
import { AuthModal } from "../auth-modal";
import { LoginGate } from "../login-gate";

function CreatorShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading, firebaseRequired, authenticated, signInWithGoogle } = useCreatorAuth();
  const { theme } = useCreatorTheme();
  const [authOpen, setAuthOpen] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleGateSignIn() {
    setSignInLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setAuthOpen(true);
    } finally {
      setSignInLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        data-theme={theme}
        className="creator-app flex min-h-screen items-center justify-center text-cp-muted"
      >
        <Loader2 className="h-8 w-8 animate-spin text-cp-accent" />
      </div>
    );
  }

  const isInviteRoute = pathname?.startsWith("/invite/");
  const showLoginGate = firebaseRequired && !authenticated && !isInviteRoute;

  if (showLoginGate) {
    return (
      <div data-theme={theme} className="creator-app">
        <LoginGate onSignIn={handleGateSignIn} loading={signInLoading} />
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="creator-app flex min-h-screen text-cp-ink antialiased">
      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <CreatorSidebar />
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-cp-ink/50 backdrop-blur-[5px]"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex">
            <CreatorSidebar onCloseMobile={() => setMobileNavOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="m-3 h-10 w-10 self-start rounded-xl border border-cp-line bg-cp-card text-cp-muted shadow-sm hover:text-cp-ink"
              aria-label="Close"
            >
              <X size={18} className="mx-auto" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <div className="space-y-4 p-3 sm:space-y-5 sm:p-5 lg:p-6">
          <CreatorTopbar onOpenMenu={() => setMobileNavOpen(true)} />
          <main id="dashboard-view" className="animate-fade-in">
            {children}
          </main>
        </div>

        <footer className="mt-auto border-t border-cp-line/80 px-4 py-4 text-center text-[11px] font-medium text-cp-muted sm:px-8">
          CrossPost · clone viral shorts
        </footer>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

export function CreatorShell({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: "light" | "dark";
}) {
  return (
    <CreatorThemeProvider initialTheme={initialTheme}>
      <CreatorToastProvider>
        <CreatorAuthProvider>
          <CreatorShellInner>{children}</CreatorShellInner>
        </CreatorAuthProvider>
      </CreatorToastProvider>
    </CreatorThemeProvider>
  );
}
