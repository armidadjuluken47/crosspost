import type { DbClient } from "@crosspost/db";
import { auditLog } from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";
import {
  ALL_PROVIDERS,
  type ComponentHealth,
  type HealthReport,
  type ProviderHealthEntry,
  type ProviderStatus,
  hasApifyCredentials,
  hasDatabaseUrl,
  hasDriveCredentials,
  hasR2Credentials,
  hasTelegramCredentials,
  hasWaveSpeedCredentials,
} from "@crosspost/shared";
import { pingDatabase } from "@crosspost/db";
import { checkFfmpeg } from "../ffmpeg/check";
import { checkGoogleDriveAccess } from "../delivery/google-drive";
import { checkR2Storage, createAssetStorage } from "../storage/index";

function component(status: "ok" | "degraded" | "error", message: string, details?: Record<string, unknown>): ComponentHealth {
  return { status, message, details };
}

function providerStatus(env: AppEnv, providerId: string, stage: "image_gen" | "video_gen" | "ingestion"): ProviderStatus {
  const provider = ALL_PROVIDERS.find((entry) => entry.id === providerId);
  if (!provider?.enabled) return "disabled";

  if (stage === "ingestion") {
    return env.INGESTION_PROVIDER_MODE === "api"
      ? hasApifyCredentials(env)
        ? "ok"
        : "missing_credentials"
      : "fixture";
  }

  if (stage === "image_gen") {
    return env.IMAGE_PROVIDER_MODE === "api"
      ? hasWaveSpeedCredentials(env)
        ? "ok"
        : "missing_credentials"
      : "fixture";
  }

  return env.VIDEO_PROVIDER_MODE === "api"
    ? hasWaveSpeedCredentials(env)
      ? "ok"
      : "missing_credentials"
    : "fixture";
}

export async function buildHealthReport(env: AppEnv): Promise<HealthReport> {
  const missingLiveCredentials: string[] = [];

  let database: ComponentHealth = component("error", "DATABASE_URL not configured");
  if (hasDatabaseUrl(env)) {
    const ok = await pingDatabase(env.DATABASE_URL!);
    database = ok
      ? component("ok", "Database reachable")
      : component("error", "Database unreachable");
    if (!ok) missingLiveCredentials.push("DATABASE_URL");
  } else {
    missingLiveCredentials.push("DATABASE_URL");
  }

  let storage: ComponentHealth;
  if (env.ASSET_STORAGE_MODE === "r2") {
    const r2 = await checkR2Storage(env);
    storage = r2.ok
      ? component("ok", r2.message, { mode: "r2" })
      : component("error", r2.message, { mode: "r2" });
    if (!r2.ok) missingLiveCredentials.push("R2 credentials");
  } else {
    createAssetStorage(env);
    storage = component("ok", "Local asset storage ready", {
      mode: "local",
      dir: env.LOCAL_ASSET_STORAGE_DIR,
    });
  }

  const ffmpeg = checkFfmpeg(env);
  const ffmpegHealth = ffmpeg.ok
    ? component("ok", ffmpeg.message, { path: ffmpeg.path })
    : component("error", ffmpeg.message, { path: ffmpeg.path });

  const ingestionMode = env.INGESTION_PROVIDER_MODE;
  const ingestion = hasApifyCredentials(env) || ingestionMode === "fixture"
    ? component(
        ingestionMode === "api" ? "ok" : "degraded",
        ingestionMode === "api" ? "Apify intake configured" : "Apify intake in fixture mode",
        { mode: ingestionMode },
      )
    : component("error", "Apify credentials missing", { mode: ingestionMode });

  if (ingestionMode === "api" && !hasApifyCredentials(env)) {
    missingLiveCredentials.push("APIFY_TOKEN", "APIFY_INSTAGRAM_ACTOR_ID");
  }

  const imageMode = env.IMAGE_PROVIDER_MODE;
  const imageGeneration = hasWaveSpeedCredentials(env) || imageMode === "fixture"
    ? component(
        imageMode === "api" ? "ok" : "degraded",
        imageMode === "api" ? "WaveSpeed image chain configured" : "Image generation in fixture mode",
        { mode: imageMode },
      )
    : component("error", "WaveSpeed credentials missing for image generation", { mode: imageMode });

  if (imageMode === "api" && !hasWaveSpeedCredentials(env)) {
    missingLiveCredentials.push("WAVESPEED_API_KEY");
  }

  const videoMode = env.VIDEO_PROVIDER_MODE;
  const videoGeneration = hasWaveSpeedCredentials(env) || videoMode === "fixture"
    ? component(
        videoMode === "api" ? "ok" : "degraded",
        videoMode === "api" ? "WaveSpeed Kling configured" : "Video generation in fixture mode",
        { mode: videoMode },
      )
    : component("error", "WaveSpeed credentials missing for video generation", { mode: videoMode });

  if (videoMode === "api" && !hasWaveSpeedCredentials(env)) {
    missingLiveCredentials.push("WAVESPEED_API_KEY");
  }

  let delivery: ComponentHealth;
  if (hasDriveCredentials(env)) {
    const driveCheck = await checkGoogleDriveAccess(env);
    delivery = driveCheck.ok
      ? component("ok", driveCheck.message, {
          mode: "drive",
          folderId: driveCheck.folderId ?? env.DRIVE_ROOT_FOLDER_ID,
          serviceAccountEmail: driveCheck.serviceAccountEmail,
        })
      : component("error", driveCheck.message, {
          mode: "drive",
          folderId: driveCheck.folderId ?? env.DRIVE_ROOT_FOLDER_ID,
          serviceAccountEmail: driveCheck.serviceAccountEmail,
        });
    if (!driveCheck.ok) missingLiveCredentials.push("DRIVE_SA_JSON_BASE64", "DRIVE_ROOT_FOLDER_ID");
  } else {
    delivery = component("degraded", "Drive delivery in fixture mode", { mode: "fixture" });
  }

  const telegram = hasTelegramCredentials(env)
    ? component("ok", "Telegram alerts configured", { chatId: env.TELEGRAM_CHAT_ID })
    : component("degraded", "Telegram alerts not configured", { mode: "disabled" });

  const providers: ProviderHealthEntry[] = ALL_PROVIDERS.map((provider) => {
    const status = providerStatus(env, provider.id, provider.stage);
    const mode =
      provider.stage === "ingestion"
        ? env.INGESTION_PROVIDER_MODE
        : provider.stage === "image_gen"
          ? env.IMAGE_PROVIDER_MODE
          : env.VIDEO_PROVIDER_MODE;

    return {
      id: provider.id,
      displayName: provider.displayName,
      stage: provider.stage,
      status,
      mode: mode === "api" ? "api" : "fixture",
      wavespeedModel: provider.wavespeedModel,
      enabled: provider.enabled,
    };
  });

  const componentStatuses = [
    database.status,
    storage.status,
    ffmpegHealth.status,
    ingestion.status,
    imageGeneration.status,
    videoGeneration.status,
    delivery.status,
    telegram.status,
  ];

  const status = componentStatuses.every((value) => value === "ok")
    ? "ok"
    : componentStatuses.some((value) => value === "error")
      ? "error"
      : "degraded";

  return {
    status,
    checkedAt: new Date().toISOString(),
    components: {
      database,
      storage,
      ffmpeg: ffmpegHealth,
      ingestion,
      imageGeneration,
      videoGeneration,
      delivery,
      telegram,
    },
    providers,
    missingLiveCredentials: [...new Set(missingLiveCredentials)],
  };
}

export async function writeAuditEvent(
  db: DbClient,
  input: {
    action: string;
    entityType: string;
    entityId?: string;
    actorUserId?: string;
    payload?: Record<string, unknown>;
  },
) {
  await db.insert(auditLog).values({
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: input.actorUserId ?? "system",
    payload: input.payload,
  });
}
