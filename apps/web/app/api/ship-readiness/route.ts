import { NextResponse } from "next/server";
import {
  hasAkoolCredentials,
  hasApifyCredentials,
  hasDatabaseUrl,
  hasR2Credentials,
  hasWaveSpeedCredentials,
} from "@crosspost/shared";
import { getServerEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { isFirebaseReady } from "@/lib/firebase-admin";

/**
 * Ship-readiness checklist for operators.
 * GET /api/ship-readiness
 */
export async function GET() {
  const env = getServerEnv();
  const stripe = getStripe();
  const stripePrices = Boolean(
    process.env.STRIPE_PRICE_MONTHLY?.trim() && process.env.STRIPE_PRICE_YEARLY?.trim(),
  );
  const stripeWebhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const resend = Boolean(env.RESEND_API_KEY?.trim());
  const appBase = Boolean(env.APP_BASE_URL?.trim());

  const checks = {
    database: hasDatabaseUrl(env),
    firebaseAdmin: isFirebaseReady(),
    wavespeed: hasWaveSpeedCredentials(env),
    r2: env.ASSET_STORAGE_MODE !== "r2" || hasR2Credentials(env),
    apify: hasApifyCredentials(env),
    stripeSecret: Boolean(stripe),
    stripePrices,
    stripeWebhook,
    resend,
    appBaseUrl: appBase,
    akool: hasAkoolCredentials(env),
    contentAiLive: env.CONTENT_AI_MODE === "api" && Boolean(env.OPENAI_API_KEY?.trim()),
    imageLive: env.IMAGE_PROVIDER_MODE === "api",
    videoLive: env.VIDEO_PROVIDER_MODE === "api",
    ingestionLive: env.INGESTION_PROVIDER_MODE === "api",
  };

  const blocking: string[] = [];
  if (!checks.database) blocking.push("DATABASE_URL");
  if (!checks.firebaseAdmin) blocking.push("GOOGLE_APPLICATION_CREDENTIALS");
  if (!checks.wavespeed && checks.videoLive) blocking.push("WAVESPEED_API_KEY");
  if (!checks.r2) blocking.push("R2_*");
  if (!checks.apify && checks.ingestionLive) blocking.push("APIFY_TOKEN");
  if (!checks.stripeSecret) blocking.push("STRIPE_SECRET_KEY");
  if (!checks.stripePrices) blocking.push("STRIPE_PRICE_MONTHLY / YEARLY");

  const warnings: string[] = [];
  if (!checks.stripeWebhook) {
    warnings.push(
      "STRIPE_WEBHOOK_SECRET missing — use Account “Refresh plan from Stripe” locally, or run: stripe listen --forward-to localhost:3000/api/stripe/webhook",
    );
  }
  if (!checks.resend) {
    warnings.push("RESEND_API_KEY missing — project-ready and invite emails stub to console");
  }
  if (!checks.appBaseUrl) {
    warnings.push("APP_BASE_URL missing — email links fall back to localhost");
  }
  if (!checks.akool) {
    warnings.push("AKOOL_API_TOKEN missing — Express swap tier unavailable");
  }
  if (!checks.contentAiLive) {
    warnings.push("CONTENT_AI_MODE is fixture — captions/transcripts are fake until set to api");
  }

  const ready = blocking.length === 0;

  return NextResponse.json({
    ready,
    checkedAt: new Date().toISOString(),
    checks,
    blocking,
    warnings,
    modes: {
      image: env.IMAGE_PROVIDER_MODE,
      video: env.VIDEO_PROVIDER_MODE,
      ingestion: env.INGESTION_PROVIDER_MODE,
      contentAi: env.CONTENT_AI_MODE,
      storage: env.ASSET_STORAGE_MODE,
    },
    nextSteps: ready
      ? [
          checks.stripeWebhook
            ? null
            : "Forward Stripe webhooks: stripe listen --forward-to localhost:3000/api/stripe/webhook",
          checks.resend
            ? null
            : "Add RESEND_API_KEY + EMAIL_FROM from https://resend.com for real emails",
          "Run live Discover intake for TikTok/YouTube from /admin/sources",
          "Smoke-test: Google sign-in → Create remix → Download ZIP → Stripe upgrade",
        ].filter(Boolean)
      : blocking.map((key) => `Fix missing: ${key}`),
  });
}
