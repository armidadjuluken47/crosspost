import { NextResponse } from "next/server";
import { getStripe, listPublicPlans } from "@/lib/stripe";

export async function GET() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  try {
    const plans = await listPublicPlans(stripe);
    return NextResponse.json({ plans });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load plans";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
