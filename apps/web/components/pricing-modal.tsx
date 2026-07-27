"use client";

import { Check, Sparkles, X } from "lucide-react";
import { useCreatorBillingActions } from "./creator/use-creator-billing";

const FALLBACK_PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    interval: null as string | null,
    desc: "Try the full loop with no commitment.",
    popular: false,
    cta: "Continue free",
    features: ["3 face-swap videos", "AI captions & hashtags", "HD download", "Browser-only — no app"],
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$99.99",
    interval: "mo",
    desc: "Unlimited remixes for creators who post weekly.",
    popular: true,
    cta: "Go monthly",
    features: [
      "Unlimited videos",
      "Priority generation queue",
      "Full caption suite",
      "Cancel anytime",
    ],
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "$299",
    interval: "yr",
    desc: "Best value if you ship every week.",
    popular: false,
    cta: "Go yearly",
    features: [
      "Unlimited videos",
      "Everything in Monthly",
      "Lower cost per month",
      "Priority support lane",
    ],
  },
] as const;

export function PricingModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { plans, plansLoading, subscribe, stripeConfigured } = useCreatorBillingActions();

  if (!isOpen) return null;

  const useLivePlans = stripeConfigured && plans.length > 0;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-cp-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="pricing-modal-shell animate-scale-up relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-cp-line bg-cp-bg sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-cp-line bg-white dark:bg-[#0f1729] text-cp-muted transition-colors hover:bg-cp-bg hover:text-cp-ink sm:right-5 sm:top-5"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-y-auto px-5 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-12">
          <div className="mx-auto max-w-xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cp-line bg-white dark:bg-[#0f1729] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cp-muted">
              <Sparkles className="h-3 w-3 text-cp-ink" />
              Pricing
            </span>
            <h2 className="cp-display mt-4 text-3xl font-bold tracking-tight text-cp-ink sm:text-4xl">
              Simple pricing.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-cp-muted sm:text-[15px]">
              Start free. Upgrade when you need unlimited remixes and priority processing.
            </p>
          </div>

          {useLivePlans ? (
            <div
              className={`mt-10 grid gap-4 ${
                plans.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"
              }`}
            >
              {plans.map((plan, index) => {
                const featured = Boolean(plan.badge) || index === Math.min(1, plans.length - 1);
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border bg-white dark:bg-cp-card p-6 transition-shadow ${
                      featured
                        ? "border-cp-ink shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                        : "border-cp-line"
                    }`}
                  >
                    {featured ? (
                      <span className="absolute -top-2.5 left-5 rounded-full bg-cp-ink px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cp-bg">
                        {plan.badge ?? "Popular"}
                      </span>
                    ) : null}
                    <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                      {plan.label}
                    </p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="cp-display text-4xl font-bold text-cp-ink">
                        {plan.priceDisplay}
                      </span>
                      {plan.interval ? (
                        <span className="text-sm text-cp-muted">/{plan.interval}</span>
                      ) : null}
                    </div>
                    {plan.trialDays ? (
                      <p className="mt-2 text-xs font-medium text-cp-muted">
                        {plan.trialDays}-day free trial
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-cp-muted">
                        {plan.unlimited ? "Unlimited generation" : "Includes free-tier features"}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={plansLoading}
                      onClick={async () => {
                        await subscribe(plan);
                        onClose();
                      }}
                      className={`mt-6 h-11 w-full text-sm ${featured ? "cp-btn cp-btn-accent" : "cp-btn cp-btn-ghost"}`}
                    >
                      Subscribe to {plan.label}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {FALLBACK_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border bg-white dark:bg-cp-card p-6 ${
                    plan.popular
                      ? "border-cp-ink shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                      : "border-cp-line"
                  }`}
                >
                  {plan.popular ? (
                    <span className="absolute -top-2.5 left-5 rounded-full bg-cp-ink px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cp-bg">
                      Popular
                    </span>
                  ) : null}
                  <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                    {plan.name}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="cp-display text-4xl font-bold text-cp-ink">{plan.price}</span>
                    {plan.interval ? (
                      <span className="text-sm text-cp-muted">/{plan.interval}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-cp-muted">{plan.desc}</p>
                  <ul className="mt-5 flex-1 space-y-2.5 border-t border-cp-line pt-5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-[13px] text-cp-ink">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cp-ink" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={onClose}
                    className={`mt-6 h-11 w-full text-sm ${plan.popular ? "cp-btn cp-btn-accent" : "cp-btn cp-btn-ghost"}`}
                  >
                    {plan.id === "free" ? plan.cta : "Configure Stripe to checkout"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-[11px] leading-relaxed text-cp-muted">
            Secure checkout powered by Stripe. Cancel anytime from your account.
          </p>
        </div>
      </div>
    </div>
  );
}
