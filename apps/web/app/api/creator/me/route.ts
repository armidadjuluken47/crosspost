import { NextRequest, NextResponse } from "next/server";
import { authenticateFirebase } from "@/lib/firebase-auth";
import { getAdminDb, isFirebaseReady } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import { creatorUserCookieHeader, resolveCreatorUserId } from "@/lib/creator-auth";
import { resolveCreatorWorkspace } from "@/lib/creator-workspace";
import { FREE_VIDEO_LIMIT, getCreatorQuotaProfile } from "@/lib/creator-quota";
import { isPaidPlan } from "@/lib/stripe/plans";

export async function GET(request: NextRequest) {
  const auth = await authenticateFirebase(request);
  const stripeConfigured = Boolean(getStripe());
  const db = getDb();

  if ("user" in auth && auth.user) {
    const { workspaceId } = await resolveCreatorWorkspace(request, db);
    const profile = await getCreatorQuotaProfile(db, auth.user.uid, workspaceId);
    const unlimited = isPaidPlan(profile);

    let hasStripeCustomer = false;
    if (isFirebaseReady()) {
      try {
        const snap = await getAdminDb().collection("users").doc(auth.user.uid).get();
        hasStripeCustomer = Boolean(snap.data()?.stripeCustomerId);
      } catch {
        // optional
      }
    }

    return NextResponse.json({
      authenticated: true,
      authMode: "firebase",
      user: {
        uid: auth.user.uid,
        email: auth.user.email ?? null,
        name: auth.user.name ?? auth.user.email?.split("@")[0] ?? "Creator",
        photoUrl: auth.user.picture ?? null,
      },
      billing: {
        plan: unlimited && profile.plan === "free" ? "monthly" : profile.plan,
        videosLimit: unlimited ? null : FREE_VIDEO_LIMIT,
        videosRemaining: unlimited ? null : profile.videosRemaining,
        unlimited,
        stripeConfigured,
        hasStripeCustomer,
        billingSource: profile.billingSource,
        workspaceName: profile.workspaceName ?? null,
      },
    });
  }

  if (!isFirebaseReady()) {
    const userId = await resolveCreatorUserId(request);
    const { workspaceId } = await resolveCreatorWorkspace(request, db);
    const profile = await getCreatorQuotaProfile(db, userId, workspaceId);
    const response = NextResponse.json({
      authenticated: true,
      authMode: "dev",
      user: {
        uid: userId,
        email: null,
        name: "Creator",
        photoUrl: null,
      },
      billing: {
        plan: profile.plan,
        videosLimit: FREE_VIDEO_LIMIT,
        videosRemaining: profile.videosRemaining,
        unlimited: profile.unlimited,
        stripeConfigured,
        hasStripeCustomer: false,
        billingSource: profile.billingSource,
        workspaceName: profile.workspaceName ?? null,
      },
    });

    if (!request.cookies.get("crosspost_uid")) {
      response.headers.set("Set-Cookie", creatorUserCookieHeader(userId));
    }

    return response;
  }

  return NextResponse.json({
    authenticated: false,
    authMode: "firebase",
    stripeConfigured,
  });
}
