import { z } from "zod";

const providerModeSchema = z.enum(["fixture", "api"]);

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  WAVESPEED_API_KEY: z.string().optional(),
  WAVESPEED_API_BASE_URL: z
    .string()
    .url()
    .default("https://api.wavespeed.ai"),
  WAVESPEED_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(3000),
  WAVESPEED_MAX_POLL_ATTEMPTS: z.coerce.number().int().positive().default(120),
  WAVESPEED_VIDEO_MAX_POLL_ATTEMPTS: z.coerce.number().int().positive().default(240),
  WAVESPEED_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  WAVESPEED_SUBMIT_TIMEOUT_MS: z.coerce.number().int().positive().default(180000),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY: z.string().optional(),
  R2_SECRET_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  APIFY_TOKEN: z.string().optional(),
  APIFY_INSTAGRAM_ACTOR_ID: z.string().optional(),
  APIFY_INSTAGRAM_TASK_ID: z.string().optional(),
  APIFY_TIKTOK_ACTOR_ID: z.string().optional(),
  APIFY_YOUTUBE_ACTOR_ID: z.string().optional(),
  /** Companion actor that returns downloadable MP4s for YouTube video IDs. */
  APIFY_YOUTUBE_DOWNLOADER_ACTOR_ID: z.string().optional(),
  APIFY_SYNC_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(300),
  INGESTION_PROVIDER_MODE: providerModeSchema.default("fixture"),
  IMAGE_PROVIDER_MODE: providerModeSchema.default("fixture"),
  VIDEO_PROVIDER_MODE: providerModeSchema.default("fixture"),
  /** Whisper + GPT captions. Use `fixture` to skip OpenAI while testing WaveSpeed video. */
  CONTENT_AI_MODE: providerModeSchema.default("fixture"),
  ASSET_STORAGE_MODE: z.enum(["local", "r2"]).default("local"),
  LOCAL_ASSET_STORAGE_DIR: z.string().default(".crosspost-storage"),
  LOCAL_ASSET_PUBLIC_BASE_URL: z.string().optional(),
  RUN_EXECUTION_MODE: z.enum(["inline", "queued"]).default("inline"),
  WORKER_LOOP: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  FFMPEG_PATH: z.string().optional(),
  DRIVE_SA_JSON_BASE64: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().optional(),
  ),
  DRIVE_ROOT_FOLDER_ID: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().optional(),
  ),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  DASHBOARD_PASSWORD: z.string().optional(),
  OPERATOR_PASSWORD: z.string().optional(),
  DAILY_SPEND_CAP_CENTS: z.coerce.number().int().nonnegative().default(0),
  REDIS_URL: z.string().optional(),
  WAVESPEED_MAX_CONCURRENT_JOBS: z.coerce.number().int().positive().default(2),
  OPENAI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  AKOOL_API_TOKEN: z.string().optional(),
  AKOOL_API_BASE_URL: z.string().url().default("https://openapi.akool.com"),
  AKOOL_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  AKOOL_MAX_POLL_ATTEMPTS: z.coerce.number().int().positive().default(120),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  // Social auto-post (direct integrations). All optional; features hide when unset.
  YOUTUBE_OAUTH_CLIENT_ID: z.string().optional(),
  YOUTUBE_OAUTH_CLIENT_SECRET: z.string().optional(),
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  /** Meta (Facebook) app for Instagram Reels via Graph API. */
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  /** Base64-encoded 32-byte key used to encrypt social OAuth tokens at rest (AES-256-GCM). */
  SOCIAL_TOKEN_ENC_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}

export function hasDatabaseUrl(env: AppEnv): boolean {
  return Boolean(env.DATABASE_URL?.trim());
}

export function hasWaveSpeedCredentials(env: AppEnv): boolean {
  return Boolean(env.WAVESPEED_API_KEY?.trim() && env.WAVESPEED_API_BASE_URL);
}

export function hasR2Credentials(env: AppEnv): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID?.trim() &&
      env.R2_ACCESS_KEY?.trim() &&
      env.R2_SECRET_KEY?.trim() &&
      env.R2_BUCKET_NAME?.trim(),
  );
}

export function hasApifyCredentials(env: AppEnv): boolean {
  return Boolean(env.APIFY_TOKEN?.trim());
}

export function hasDriveCredentials(env: AppEnv): boolean {
  return Boolean(env.DRIVE_SA_JSON_BASE64?.trim() && env.DRIVE_ROOT_FOLDER_ID?.trim());
}

export function hasTelegramCredentials(env: AppEnv): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN?.trim() && env.TELEGRAM_CHAT_ID?.trim());
}

export function hasAkoolCredentials(env: AppEnv): boolean {
  return Boolean(env.AKOOL_API_TOKEN?.trim());
}

export function hasYouTubeOAuth(env: AppEnv): boolean {
  return Boolean(
    env.YOUTUBE_OAUTH_CLIENT_ID?.trim() &&
      env.YOUTUBE_OAUTH_CLIENT_SECRET?.trim() &&
      env.SOCIAL_TOKEN_ENC_KEY?.trim() &&
      env.APP_BASE_URL?.trim(),
  );
}

export function hasTikTokOAuth(env: AppEnv): boolean {
  return Boolean(
    env.TIKTOK_CLIENT_KEY?.trim() &&
      env.TIKTOK_CLIENT_SECRET?.trim() &&
      env.SOCIAL_TOKEN_ENC_KEY?.trim() &&
      env.APP_BASE_URL?.trim(),
  );
}

export function hasInstagramOAuth(env: AppEnv): boolean {
  return Boolean(
    env.META_APP_ID?.trim() &&
      env.META_APP_SECRET?.trim() &&
      env.SOCIAL_TOKEN_ENC_KEY?.trim() &&
      env.APP_BASE_URL?.trim(),
  );
}

/** True when the given social platform's OAuth env is fully configured. */
export function isSocialOAuthConfigured(
  env: AppEnv,
  platform: "youtube" | "tiktok" | "instagram",
): boolean {
  switch (platform) {
    case "youtube":
      return hasYouTubeOAuth(env);
    case "tiktok":
      return hasTikTokOAuth(env);
    case "instagram":
      return hasInstagramOAuth(env);
  }
}

export function parseDriveServiceAccount(env: AppEnv): Record<string, unknown> | null {
  if (!env.DRIVE_SA_JSON_BASE64?.trim()) return null;
  try {
    const json = Buffer.from(env.DRIVE_SA_JSON_BASE64, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
