"use client";

import { useCallback, useEffect, useState } from "react";
import { isPaidPlan } from "@/lib/stripe/plans";
import { useCreatorAuth } from "./creator-auth-provider";
import { useCreatorToast } from "./creator-toast";

export type PublicStripePlan = {
  id: string;
  priceId: string;
  label: string;
  priceDisplay: string;
  interval: string | null;
  unlimited: boolean;
  trialDays?: number;
  badge?: string;
};

export function useCreatorBillingActions() {
  const { authenticated, authMode, firebaseUser, startCheckout, openBillingPortal, billing } =
    useCreatorAuth();
  const { showToast } = useCreatorToast();
  const [plans, setPlans] = useState<PublicStripePlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    if (!billing?.stripeConfigured) {
      setPlansLoading(false);
      return;
    }

    fetch("/api/stripe/plans")
      .then((response) => response.json())
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, [billing?.stripeConfigured]);

  const subscribe = useCallback(
    async (plan: PublicStripePlan) => {
      if (!billing?.stripeConfigured) {
        showToast("Add STRIPE_SECRET_KEY and price IDs to .env to enable checkout.", "error");
        return;
      }

      if (!authenticated || authMode !== "firebase" || !firebaseUser) {
        showToast("Sign in with Google to subscribe.", "error");
        return;
      }

      try {
        await startCheckout(plan.priceId, plan.id);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Checkout failed", "error");
      }
    },
    [
      authenticated,
      authMode,
      billing?.stripeConfigured,
      firebaseUser,
      showToast,
      startCheckout,
    ],
  );

  const manageBilling = useCallback(async () => {
    if (!billing?.stripeConfigured) {
      showToast("Stripe is not configured yet.", "error");
      return;
    }

    if (!authenticated || authMode !== "firebase") {
      showToast("Sign in with Google to manage billing.", "error");
      return;
    }

    try {
      await openBillingPortal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Billing portal failed", "error");
    }
  }, [authenticated, authMode, billing?.stripeConfigured, openBillingPortal, showToast]);

  return {
    plans,
    plansLoading,
    subscribe,
    manageBilling,
    stripeConfigured: Boolean(billing?.stripeConfigured),
    isPaid: isPaidPlan(billing),
  };
}
