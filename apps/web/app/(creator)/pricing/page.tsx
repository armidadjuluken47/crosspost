"use client";

import { useState } from "react";
import { Check, Sparkles, Zap } from "lucide-react";
import { PricingModal } from "@/components/pricing-modal";
import { useCreatorBillingActions } from "@/components/creator/use-creator-billing";

export default function PricingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { plans, plansLoading, subscribe, stripeConfigured } = useCreatorBillingActions();

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="animate-stagger text-center">
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-cp-accent/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-cp-accent">
            <Sparkles className="h-3 w-3" /> Pricing tiers
          </span>
          <h1 className="cp-display mt-4 text-3xl font-semibold tracking-tight text-cp-ink sm:text-4xl">
            Flexible plans for active creators
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-cp-muted">
            {stripeConfigured
              ? "Subscribe with Stripe — plans sync to your account automatically."
              : "Add Stripe keys to .env to enable live checkout."}
          </p>
        </div>

        <div className="animate-stagger animate-stagger-delay-1 mt-12 grid gap-5 text-left md:grid-cols-2">
          {(stripeConfigured && plans.length > 0 ? plans : []).map((plan, index) => (
            <div
              key={plan.id}
              className={`cp-well relative flex flex-col justify-between space-y-5 p-7 sm:p-8 ${
                index === plans.length - 1 ? "border-2 border-cp-ink" : ""
              }`}
            >
              {plan.badge || index === plans.length - 1 ? (
                <span className="absolute -top-3 left-6 rounded-2xl bg-cp-accent px-3 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white">
                  {plan.badge ?? "Most popular"}
                </span>
              ) : null}
              <div>
                <h3 className="cp-display text-xl font-semibold text-cp-ink">{plan.label}</h3>
                <div className="mt-4">
                  <span className="cp-display text-3xl font-semibold text-cp-ink">
                    {plan.priceDisplay}
                  </span>
                  {plan.interval ? (
                    <span className="ml-1 text-xs text-cp-muted">/{plan.interval}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                disabled={plansLoading}
                onClick={() => subscribe(plan)}
                className={`cp-btn w-full ${index === plans.length - 1 ? "cp-btn-accent" : ""}`}
              >
                Subscribe to {plan.label}
              </button>
            </div>
          ))}

          {!stripeConfigured || plans.length === 0
            ? [
                {
                  name: "Creator",
                  price: "$29",
                  desc: "For creators launching content channels.",
                  popular: false,
                },
                {
                  name: "Pro",
                  price: "$79",
                  desc: "For agency workflows and viral multipliers.",
                  popular: true,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`cp-well relative flex flex-col justify-between space-y-5 p-7 sm:p-8 ${
                    plan.popular ? "border-2 border-cp-ink" : ""
                  }`}
                >
                  {plan.popular ? (
                    <span className="absolute -top-3 left-6 rounded-2xl bg-cp-accent px-3 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white">
                      Most popular
                    </span>
                  ) : null}
                  <div>
                    <h3 className="cp-display text-xl font-semibold text-cp-ink">{plan.name}</h3>
                    <p className="mt-1 text-xs text-cp-muted">{plan.desc}</p>
                    <div className="mt-4">
                      <span className="cp-display text-3xl font-semibold text-cp-ink">
                        {plan.price}
                      </span>
                      <span className="ml-1 text-xs text-cp-muted">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-2 border-t border-cp-line pt-4 text-xs text-cp-ink/80">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cp-success" />
                      Unlimited AI captions
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cp-success" />
                      Face-swap video pipeline
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className={`cp-btn w-full ${plan.popular ? "cp-btn-accent" : ""}`}
                  >
                    View plan details
                  </button>
                </div>
              ))
            : null}
        </div>

        <div className="animate-stagger animate-stagger-delay-2 mt-10 text-center">
          <button type="button" onClick={() => setModalOpen(true)} className="cp-btn cp-btn-ghost">
            <Zap className="h-3.5 w-3.5" /> Compare plans in modal view
          </button>
        </div>
      </div>

      <PricingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
