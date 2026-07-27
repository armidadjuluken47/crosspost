"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  PlusCircle,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { PricingModal } from "./pricing-modal";
import { WorkspaceSettingsPanel } from "./workspace-settings-panel";
import { ConnectedAccounts } from "./connected-accounts";
import { useCreatorAuth } from "./creator/creator-auth-provider";
import { useCreatorBillingActions } from "./creator/use-creator-billing";
import { useCreatorToast } from "./creator/creator-toast";
import { creatorFetch } from "@/lib/creator-api";

type ProjectRow = {
  publicId: string;
  title: string;
  status: string;
  createdAt: string;
};

export function AccountView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useCreatorToast();
  const { user, billing, authMode, refreshSession } = useCreatorAuth();
  const { manageBilling, isPaid } = useCreatorBillingActions();
  const [recentProjects, setRecentProjects] = useState<ProjectRow[]>([]);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const healedFreePlanRef = useRef(false);

  const videosLimit = billing?.videosLimit ?? 3;
  const videosRemaining = billing?.videosRemaining ?? 3;
  const videosUsed = Math.max(0, videosLimit - (videosRemaining ?? 0));
  const planLabel =
    billing?.plan === "monthly"
      ? "Creator Pro"
      : billing?.plan === "yearly"
        ? "Creator Pro (Yearly)"
        : isPaid
          ? "Creator Pro"
          : "Free";

  useEffect(() => {
    creatorFetch("/api/creator/projects")
      .then((response) => response.json())
      .then((data) => setRecentProjects((data.projects ?? []).slice(0, 6)))
      .catch(() => undefined);
  }, []);

  // After Stripe Checkout — and when Account still shows Free — pull plan from Stripe.
  // Localhost webhooks often never fire, so this is the source of truth.
  useEffect(() => {
    const checkoutSuccess = searchParams.get("checkout") === "success";
    const shouldHealFreePlan =
      authMode === "firebase" &&
      billing != null &&
      billing.stripeConfigured &&
      !isPaid &&
      !healedFreePlanRef.current;

    if (!checkoutSuccess && !shouldHealFreePlan) return;
    if (!checkoutSuccess) healedFreePlanRef.current = true;

    let cancelled = false;
    setSyncingCheckout(true);

    (async () => {
      try {
        const response = await creatorFetch("/api/stripe/sync-subscription", {
          method: "POST",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Could not sync subscription");
        }
        await refreshSession();
        if (!cancelled) {
          if (data.plan && data.plan !== "free") {
            showToast(`You're on Creator Pro (${data.plan}).`, "success");
          } else if (checkoutSuccess) {
            showToast(
              "Checkout received — no active subscription found yet. Wait a few seconds and tap Refresh.",
              "error",
            );
          }
          if (checkoutSuccess) router.replace("/account");
        }
      } catch (error) {
        if (!cancelled && checkoutSuccess) {
          showToast(
            error instanceof Error ? error.message : "Could not sync subscription",
            "error",
          );
          router.replace("/account");
        }
      } finally {
        if (!cancelled) setSyncingCheckout(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("checkout"), authMode, billing?.stripeConfigured, isPaid]);

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        {syncingCheckout ? (
          <div className="rounded-2xl border border-cp-success/20 bg-cp-success/10 px-4 py-3 text-sm text-cp-success">
            Syncing your Stripe plan…
          </div>
        ) : null}

        <div className="animate-stagger flex flex-col items-center justify-between gap-6 border-b border-cp-line pb-8 md:flex-row md:items-end">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-cp-ink bg-cp-bg">
              {user?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-cp-muted" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="cp-display text-2xl font-semibold tracking-tight text-cp-ink">
                  {user?.name ?? "Creator"}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-2xl border border-cp-line bg-cp-card px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cp-muted">
                  <ShieldCheck className="h-3 w-3 text-cp-success" />
                  {authMode === "firebase" ? "Verified" : "Dev session"}
                </span>
              </div>
              <p className="mt-1 text-xs text-cp-muted">
                {user?.email ?? "Local dev cookie session"}
              </p>
            </div>
          </div>

          <Link href="/create" className="cp-btn cp-btn-accent shrink-0">
            Create new video
          </Link>
        </div>

        <div className="animate-stagger animate-stagger-delay-1 grid gap-5 md:grid-cols-2">
          <div className="cp-well flex flex-col justify-between space-y-5 p-6">
            <div className="space-y-4">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-cp-muted">
                Current plan & quotas
              </span>
              <div>
                <span className="cp-display flex items-center gap-2 text-3xl font-semibold text-cp-ink">
                  {isPaid ? planLabel : `${planLabel} Plan`}{" "}
                  <Zap className="h-5 w-5 fill-current text-cp-accent" />
                </span>
                <p className="mt-1.5 text-xs leading-relaxed text-cp-muted">
                  {billing?.billingSource === "workspace_owner"
                    ? `Using Agency Pro via ${billing.workspaceName ?? "team workspace"} — unlimited while this workspace is active.`
                    : isPaid
                      ? "Unlimited remixes on your active Pro subscription."
                      : "Free tier — upgrade for unlimited processing."}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 rounded-2xl border border-cp-line bg-cp-bg p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-cp-ink">
                <span>Usage quota meter</span>
                <span>
                  {isPaid ? "Unlimited" : `${videosUsed} / ${videosLimit} videos`}
                </span>
              </div>
              {!isPaid ? (
                <div className="relative h-2 w-full overflow-hidden rounded-2xl bg-cp-line">
                  <div
                    style={{
                      width: `${Math.min(100, (videosUsed / Math.max(1, videosLimit)) * 100)}%`,
                    }}
                    className="h-full rounded-2xl bg-cp-accent transition-all duration-300"
                  />
                </div>
              ) : (
                <div className="relative h-2 w-full overflow-hidden rounded-2xl bg-cp-line">
                  <div className="h-full w-full rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500" />
                </div>
              )}
              <p className="flex items-center justify-between pt-1 text-[11px] text-cp-muted">
                <span>
                  {isPaid ? "Pro · no free-tier caps" : "Free tier: 3 videos to start"}
                </span>
                {!isPaid ? (
                  <span className="font-bold text-cp-ink">{videosRemaining} videos left</span>
                ) : (
                  <span className="font-bold text-cp-ink">Unlimited</span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  const response = await creatorFetch("/api/stripe/sync-subscription", {
                    method: "POST",
                  });
                  const data = await response.json();
                  if (!response.ok) throw new Error(data.error ?? "Sync failed");
                  await refreshSession();
                  showToast(
                    data.plan && data.plan !== "free"
                      ? `Synced — you're on ${data.plan}.`
                      : "Synced — still on Free (no active Stripe sub).",
                    data.plan && data.plan !== "free" ? "success" : "error",
                  );
                } catch (error) {
                  showToast(
                    error instanceof Error ? error.message : "Sync failed",
                    "error",
                  );
                }
              }}
              className="cp-btn cp-btn-ghost w-full"
            >
              Refresh plan from Stripe
            </button>

            <button
              type="button"
              onClick={() => {
                if (isPaid) {
                  if (billing?.hasStripeCustomer) {
                    manageBilling();
                  } else {
                    showToast("Open Refresh plan from Stripe if billing portal is unavailable.", "error");
                  }
                } else {
                  setPricingOpen(true);
                }
              }}
              className="cp-btn cp-btn-accent w-full"
            >
              {isPaid ? "Manage subscription billing" : "Upgrade to Creator Pro"}
            </button>
          </div>

          <div className="cp-well flex flex-col justify-between space-y-4 p-6">
            <div className="space-y-3">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-cp-muted">
                Portrait registry
              </span>
              <div>
                <h3 className="cp-display text-lg font-semibold text-cp-ink">
                  Saved face references
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-cp-muted">
                  Your identity is created on first upload and reused for future projects.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 rounded-2xl border border-cp-line bg-cp-bg p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-2xl border border-dashed border-cp-line bg-cp-card"
                />
              ))}
              <Link
                href="/create"
                className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-cp-line text-cp-muted transition-colors hover:border-cp-ink hover:text-cp-ink"
              >
                <PlusCircle className="h-5 w-5" />
              </Link>
            </div>

            <Link href="/create" className="cp-btn cp-btn-ghost w-full">
              Manage faces & photo upload
            </Link>
          </div>
        </div>

        <div className="animate-stagger animate-stagger-delay-2 mt-8">
          <ConnectedAccounts />
        </div>

        <div className="animate-stagger animate-stagger-delay-2 mt-8">
          <WorkspaceSettingsPanel />
        </div>

        <div className="animate-stagger animate-stagger-delay-2 mt-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-cp-muted">
              Recent project logs
            </h3>
            <Link href="/projects" className="text-xs font-medium text-cp-muted hover:text-cp-ink">
              View all
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="rounded-2xl border border-cp-line bg-cp-card p-8 text-center text-xs text-cp-muted">
              No items in historical record.
            </div>
          ) : (
            <div className="cp-well divide-y divide-cp-line overflow-hidden">
              {recentProjects.map((project) => (
                <Link
                  key={project.publicId}
                  href={`/projects/${project.publicId}`}
                  className="flex items-center justify-between p-4 px-5 transition-colors hover:bg-cp-bg sm:px-6"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="relative flex h-11 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cp-line bg-gradient-to-br from-cp-ink to-cp-accent/50">
                      <span className="text-[8px] font-bold text-white">9:16</span>
                    </div>
                    <div>
                      <span className="block max-w-[240px] truncate text-sm font-semibold text-cp-ink">
                        {project.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-cp-muted">
                        Created {new Date(project.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-2xl px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                        project.status === "ready"
                          ? "bg-cp-success/10 text-cp-success"
                          : project.status === "failed"
                            ? "bg-cp-accent/10 text-cp-accent"
                            : "animate-pulse bg-cp-ink/5 text-cp-muted"
                      }`}
                    >
                      {project.status}
                    </span>
                    <ArrowRight className="h-4 w-4 text-cp-muted" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <PricingModal
        isOpen={pricingOpen}
        onClose={() => setPricingOpen(false)}
      />
    </>
  );
}
