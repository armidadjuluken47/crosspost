import { NextRequest, NextResponse } from "next/server";
import { authenticateFirebase } from "@/lib/firebase-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const auth = await authenticateFirebase(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(auth.user.uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json(
        { error: "No billing account yet. Subscribe to a plan first." },
        { status: 400 },
      );
    }

    const origin = request.headers.get("origin") ?? "http://localhost:3000";
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: body.returnUrl || `${origin}/account`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Portal failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
