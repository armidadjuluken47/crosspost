import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { authenticateFirebase } from "@/lib/firebase-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  applySubscriptionToUser,
  getPlanFromPriceId,
  getStripe,
  planToUserFields,
  type PlanId,
} from "@/lib/stripe";

function resolvePlanId(sub: Stripe.Subscription): PlanId | null {
  const priceId = sub.items.data[0]?.price?.id;
  const matched = priceId ? getPlanFromPriceId(priceId) : null;
  if (matched) return matched.id;

  const meta = sub.metadata?.planId;
  if (meta === "monthly" || meta === "yearly") return meta;

  // Active paid sub with unknown price still unlocks Pro
  if (sub.status === "active" || sub.status === "trialing") return "monthly";
  return null;
}

/**
 * Pull the user's latest Stripe subscription into Firestore.
 * Used after checkout when local webhooks aren't running (`stripe listen`).
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const auth = await authenticateFirebase(request);
  if (auth.error) return auth.error;

  try {
    const db = getAdminDb();
    const userRef = db.collection("users").doc(auth.user.uid);
    const snap = await userRef.get();
    let customerId =
      typeof snap.data()?.stripeCustomerId === "string"
        ? (snap.data()?.stripeCustomerId as string)
        : null;

    if (!customerId && auth.user.email) {
      const customers = await stripe.customers.list({
        email: auth.user.email,
        limit: 5,
      });
      customerId = customers.data[0]?.id ?? null;
    }

    // Fallback: find subscription tagged with this Firebase uid (checkout metadata)
    let active: Stripe.Subscription | undefined;
    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
        expand: ["data.items.data.price"],
      });
      active = subscriptions.data.find(
        (sub) => sub.status === "active" || sub.status === "trialing",
      );
    }

    if (!active) {
      try {
        const search = await stripe.subscriptions.search({
          query: `metadata["userId"]:"${auth.user.uid}" AND status:"active"`,
          limit: 5,
          expand: ["data.items.data.price"],
        });
        active = search.data[0];
        if (!active) {
          const trialSearch = await stripe.subscriptions.search({
            query: `metadata["userId"]:"${auth.user.uid}" AND status:"trialing"`,
            limit: 5,
            expand: ["data.items.data.price"],
          });
          active = trialSearch.data[0];
        }
        if (active) {
          const cust = active.customer;
          customerId = typeof cust === "string" ? cust : cust.id;
        }
      } catch {
        // Search API may be unavailable on some accounts — ignore
      }
    }

    if (!active && !customerId) {
      return NextResponse.json({
        synced: false,
        plan: "free",
        message: "No Stripe customer found for this account yet.",
      });
    }

    if (!active) {
      await applySubscriptionToUser(db, auth.user.uid, "free", customerId, null);
      return NextResponse.json({
        synced: true,
        plan: "free",
        message: "No active subscription — set to free.",
      });
    }

    const planId = resolvePlanId(active) ?? "monthly";
    await applySubscriptionToUser(db, auth.user.uid, planId, customerId, active.id);

    return NextResponse.json({
      synced: true,
      ...planToUserFields(planId),
      plan: planId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: active.id,
      status: active.status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("Stripe sync error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
