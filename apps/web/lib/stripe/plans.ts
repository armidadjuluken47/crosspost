export type PlanId = "monthly" | "yearly" | "free";

export interface PlanConfig {
  id: PlanId;
  priceId: string | null;
  label: string;
  priceDisplay: string;
  interval: "month" | "year" | null;
  unlimited: boolean;
  trialDays?: number;
  badge?: string;
}

const UNLIMITED_VIDEOS = -1;
export const FREE_VIDEO_LIMIT = 3;

export function getPlanFromPriceId(priceId: string): PlanConfig | null {
  return getPlans().find((plan) => plan.priceId === priceId) ?? null;
}

export function getPlans(): PlanConfig[] {
  const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY ?? "";
  const yearlyPriceId = process.env.STRIPE_PRICE_YEARLY ?? "";

  const plans: PlanConfig[] = [];

  if (monthlyPriceId) {
    plans.push({
      id: "monthly",
      priceId: monthlyPriceId,
      label: "Monthly",
      priceDisplay: "$99.99",
      interval: "month",
      unlimited: true,
      trialDays: 3,
    });
  }

  if (yearlyPriceId) {
    plans.push({
      id: "yearly",
      priceId: yearlyPriceId,
      label: "Yearly",
      priceDisplay: "$299.00",
      interval: "year",
      unlimited: true,
      badge: "Best value",
    });
  }

  return plans;
}

export function planToUserFields(planId: PlanId): {
  plan: string;
  videosRemaining: number;
  unlimited: boolean;
} {
  if (planId === "free") {
    return { plan: "free", videosRemaining: FREE_VIDEO_LIMIT, unlimited: false };
  }

  return {
    plan: planId,
    videosRemaining: UNLIMITED_VIDEOS,
    unlimited: true,
  };
}

export function isPaidPlan(
  profile: { unlimited?: boolean | null; plan?: string | null; videosRemaining?: number | null } | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.unlimited) return true;
  if (profile.videosRemaining === UNLIMITED_VIDEOS) return true;
  return profile.plan === "monthly" || profile.plan === "yearly";
}

export function hasVideoQuota(
  profile: { videosRemaining?: number; unlimited?: boolean; plan?: string } | null | undefined,
): boolean {
  if (!profile) return false;
  if (isPaidPlan(profile)) return true;
  return (profile.videosRemaining ?? 0) > 0;
}
