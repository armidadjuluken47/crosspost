import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticateFirebase } from "@/lib/firebase-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { getPlanFromPriceId, getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const auth = await authenticateFirebase(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { priceId, planId, successUrl, cancelUrl, customerEmail, userId } = body;

    if (!priceId || !userId) {
      return NextResponse.json({ error: "priceId and userId are required" }, { status: 400 });
    }

    if (auth.user.uid !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const plan = getPlanFromPriceId(priceId);
    const resolvedPlanId = planId || plan?.id || "monthly";
    const origin = request.headers.get("origin") ?? "http://localhost:3000";
    const email = customerEmail || auth.user.email || undefined;

    const db = getAdminDb();
    const userRef = db.collection("users").doc(auth.user.uid);
    const snap = await userRef.get();
    let customerId =
      typeof snap.data()?.stripeCustomerId === "string"
        ? (snap.data()?.stripeCustomerId as string)
        : null;

    if (!customerId && email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      customerId = existing.data[0]?.id ?? null;
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId: auth.user.uid },
        name: auth.user.name ?? undefined,
      });
      customerId = customer.id;
    }

    await userRef.set(
      {
        stripeCustomerId: customerId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl || `${origin}/account?checkout=success`,
      cancel_url: cancelUrl || `${origin}/account`,
      customer: customerId,
      client_reference_id: auth.user.uid,
      metadata: { userId, planId: resolvedPlanId },
      subscription_data: {
        metadata: { userId, planId: resolvedPlanId },
        ...(plan?.trialDays ? { trial_period_days: plan.trialDays } : {}),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
