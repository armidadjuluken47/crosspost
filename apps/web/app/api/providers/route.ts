import { NextResponse } from "next/server";
import { listAllProviderConfigs } from "@crosspost/pipeline";
import { getServerEnv } from "@/lib/env";
import { getDb } from "@/lib/db";

export async function GET() {
  const env = getServerEnv();
  const db = getDb();
  const providers = await listAllProviderConfigs(db);

  return NextResponse.json({
    imageProviderOrder: providers
      .filter((provider) => provider.stage === "image_gen" && provider.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((provider) => provider.id),
    videoProviderOrder: providers
      .filter((provider) => provider.stage === "video_gen" && provider.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((provider) => provider.id),
    disabledProviders: providers.filter((provider) => !provider.enabled).map((provider) => provider.id),
    modes: {
      image: env.IMAGE_PROVIDER_MODE,
      video: env.VIDEO_PROVIDER_MODE,
      ingestion: env.INGESTION_PROVIDER_MODE,
      storage: env.ASSET_STORAGE_MODE,
    },
    readiness: {
      wavespeed: Boolean(env.WAVESPEED_API_KEY),
      r2: Boolean(env.R2_BUCKET_NAME && env.R2_ACCESS_KEY && env.R2_SECRET_KEY),
      apify: Boolean(env.APIFY_TOKEN),
      database: Boolean(env.DATABASE_URL),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      resend: Boolean(env.RESEND_API_KEY?.trim()),
      akool: Boolean(env.AKOOL_API_TOKEN?.trim()),
      appBaseUrl: Boolean(env.APP_BASE_URL?.trim()),
    },
    shipReadinessUrl: "/api/ship-readiness",
  });
}
