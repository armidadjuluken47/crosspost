import { NextResponse } from "next/server";
import { isFirebaseReady } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  return NextResponse.json({
    firebaseRequired: isFirebaseReady(),
    stripeConfigured: Boolean(getStripe()),
  });
}
