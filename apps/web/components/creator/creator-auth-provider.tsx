"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  firebaseAuth,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutCreator,
} from "@/lib/firebase-client";
import { creatorFetch } from "@/lib/creator-api";

export type CreatorBilling = {
  plan: string;
  videosLimit: number | null;
  videosRemaining: number | null;
  unlimited: boolean;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  billingSource?: "self" | "workspace_owner";
  workspaceName?: string | null;
};

export type CreatorSessionUser = {
  uid: string;
  email: string | null;
  name: string;
  photoUrl: string | null;
};

type CreatorAuthContextValue = {
  loading: boolean;
  firebaseRequired: boolean;
  authenticated: boolean;
  authMode: "firebase" | "dev" | null;
  user: CreatorSessionUser | null;
  firebaseUser: User | null;
  billing: CreatorBilling | null;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  startCheckout: (priceId: string, planId: string) => Promise<void>;
  openBillingPortal: () => Promise<void>;
};

const CreatorAuthContext = createContext<CreatorAuthContextValue | null>(null);

async function loadSession() {
  const response = await creatorFetch("/api/creator/me");
  if (!response.ok) return null;
  return response.json() as Promise<{
    authenticated: boolean;
    authMode?: "firebase" | "dev";
    user?: CreatorSessionUser;
    billing?: CreatorBilling;
  }>;
}

export function CreatorAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [firebaseRequired, setFirebaseRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<"firebase" | "dev" | null>(null);
  const [user, setUser] = useState<CreatorSessionUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [billing, setBilling] = useState<CreatorBilling | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const session = await loadSession();
    if (!session?.authenticated) {
      setAuthenticated(false);
      setUser(null);
      setBilling(null);
      setAuthMode(session?.authMode ?? null);
      return;
    }

    setAuthenticated(true);
    setAuthMode(session.authMode ?? null);
    setUser(session.user ?? null);
    setBilling(session.billing ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      const configResponse = await fetch("/api/creator/auth-config");
      const config = configResponse.ok
        ? ((await configResponse.json()) as { firebaseRequired?: boolean })
        : { firebaseRequired: false };

      if (!active) return;
      setFirebaseRequired(Boolean(config.firebaseRequired));

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (nextUser) => {
        if (!active) return;
        setFirebaseUser(nextUser);
        await refreshSession();
        if (active) setLoading(false);
      });

      if (!config.firebaseRequired) {
        await refreshSession();
        if (active) setLoading(false);
      }

      return unsubscribe;
    }

    let unsubscribe: (() => void) | undefined;
    init().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [refreshSession]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await firebaseSignInWithGoogle();
      await refreshSession();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign-in failed");
      throw error;
    }
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    setAuthError(null);
    if (firebaseUser) {
      await signOutCreator();
    }
    document.cookie = "crosspost_uid=; Path=/; Max-Age=0; SameSite=Lax";
    setAuthenticated(false);
    setUser(null);
    setBilling(null);
    setFirebaseUser(null);
    router.push("/");
  }, [firebaseUser, router]);

  const startCheckout = useCallback(
    async (priceId: string, planId: string) => {
      if (!firebaseUser) {
        throw new Error("Sign in to subscribe.");
      }

      const response = await creatorFetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          planId,
          userId: firebaseUser.uid,
          customerEmail: firebaseUser.email,
          successUrl: `${window.location.origin}/account?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Checkout failed");
      }
      if (data.url) {
        window.location.href = data.url;
      }
    },
    [firebaseUser],
  );

  const openBillingPortal = useCallback(async () => {
    const response = await creatorFetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnUrl: `${window.location.origin}/account` }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Could not open billing portal");
    }
    if (data.url) {
      window.location.href = data.url;
    }
  }, []);

  const value = useMemo(
    () => ({
      loading,
      firebaseRequired,
      authenticated,
      authMode,
      user,
      firebaseUser,
      billing,
      authError,
      signInWithGoogle,
      signOut,
      refreshSession,
      startCheckout,
      openBillingPortal,
    }),
    [
      loading,
      firebaseRequired,
      authenticated,
      authMode,
      user,
      firebaseUser,
      billing,
      authError,
      signInWithGoogle,
      signOut,
      refreshSession,
      startCheckout,
      openBillingPortal,
    ],
  );

  return <CreatorAuthContext.Provider value={value}>{children}</CreatorAuthContext.Provider>;
}

export function useCreatorAuth() {
  const context = useContext(CreatorAuthContext);
  if (!context) {
    throw new Error("useCreatorAuth must be used within CreatorAuthProvider");
  }
  return context;
}
