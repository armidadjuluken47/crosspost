import Stripe from "stripe";
import admin from "firebase-admin";
import {
  getPlanFromPriceId,
  getPlans,
  isPaidPlan,
  planToUserFields,
  type PlanId,
} from "./plans";

export { getPlanFromPriceId, getPlans, isPaidPlan, planToUserFields, type PlanId };

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

async function resolvePlanIdFromSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<PlanId | null> {
  const metaPlan = session.metadata?.planId as PlanId | undefined;
  if (metaPlan === "monthly" || metaPlan === "yearly") return metaPlan;

  if (session.subscription) {
    const subId =
      typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
    const priceId = sub.items.data[0]?.price?.id;
    if (priceId) {
      const plan = getPlanFromPriceId(priceId);
      if (plan) return plan.id;
    }
  }

  return null;
}

export async function applySubscriptionToUser(
  db: admin.firestore.Firestore,
  userId: string,
  planId: PlanId,
  stripeCustomerId?: string | null,
  stripeSubscriptionId?: string | null,
) {
  const fields = planToUserFields(planId);
  const update: Record<string, unknown> = {
    ...fields,
    lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (stripeCustomerId) update.stripeCustomerId = stripeCustomerId;
  if (stripeSubscriptionId) update.stripeSubscriptionId = stripeSubscriptionId;
  if (planId === "free") {
    update.stripeSubscriptionId = admin.firestore.FieldValue.delete();
  }

  await db.collection("users").doc(userId).set(update, { merge: true });
}

export async function handleStripeWebhookEvent(stripe: Stripe, event: Stripe.Event) {
  const { getAdminDb } = await import("../firebase-admin");
  const db = getAdminDb();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (userId) {
      const planId = await resolvePlanIdFromSession(stripe, session);
      if (planId) {
        await applySubscriptionToUser(
          db,
          userId,
          planId,
          typeof session.customer === "string" ? session.customer : session.customer?.id,
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
        );
      }
    }
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.created"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    let userId = sub.metadata?.userId;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

    if (!userId && customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        userId = customer.metadata?.userId;
      }
    }

    if (userId) {
      const active = sub.status === "active" || sub.status === "trialing";
      if (!active) {
        await applySubscriptionToUser(db, userId, "free", customerId, null);
      } else {
        const priceId = sub.items.data[0]?.price?.id;
        const matched = priceId ? getPlanFromPriceId(priceId) : null;
        const meta = sub.metadata?.planId;
        const planId: PlanId =
          matched?.id ??
          (meta === "yearly" || meta === "monthly" ? meta : "monthly");
        await applySubscriptionToUser(db, userId, planId, customerId, sub.id);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    let userId = sub.metadata?.userId;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (!userId && customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) userId = customer.metadata?.userId;
      } catch {
        // ignore
      }
    }
    if (userId) {
      await applySubscriptionToUser(db, userId, "free", customerId, null);
    }
  }
}

export async function listPublicPlans(stripe: Stripe) {
  const configs = getPlans().filter((plan) => plan.priceId);
  return Promise.all(
    configs.map(async (config) => {
      const price = await stripe.prices.retrieve(config.priceId!);
      const amount = price.unit_amount ?? 0;
      const display =
        amount % 100 === 0 ? `$${amount / 100}` : `$${(amount / 100).toFixed(2)}`;

      return {
        id: config.id,
        priceId: config.priceId,
        label: config.label,
        priceDisplay: display,
        interval: price.recurring?.interval ?? config.interval,
        unlimited: config.unlimited,
        trialDays: config.trialDays,
        badge: config.badge,
      };
    }),
  );
}
