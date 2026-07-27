import { randomUUID } from "node:crypto";
import type { AppEnv } from "@crosspost/shared";
import { hasApifyCredentials } from "@crosspost/shared";
import { downloadBinary } from "../ingestion/download";
import {
  detectSourcePlatformFromUrl,
  fetchApifyVideoByUrl,
} from "../ingestion/apify-client";
import { createAssetStorage } from "../storage/index";

export async function importCreatorVideoFromUrl(env: AppEnv, sourceUrl: string) {
  const url = sourceUrl.trim();
  if (!url) {
    throw new Error("URL is required");
  }

  const platform = detectSourcePlatformFromUrl(url);
  if (!platform) {
    throw new Error(
      "Unsupported URL. Paste an Instagram Reel, TikTok, or YouTube Shorts link — or upload an MP4.",
    );
  }

  if (env.INGESTION_PROVIDER_MODE !== "api" || !hasApifyCredentials(env)) {
    throw new Error(
      "Set APIFY_TOKEN and INGESTION_PROVIDER_MODE=api in .env to enable URL import",
    );
  }

  const candidate = await fetchApifyVideoByUrl(env, url);
  if (!candidate.videoUrl || !/^https?:\/\//i.test(candidate.videoUrl)) {
    throw new Error("No downloadable MP4 for that URL. Try another link or upload an MP4.");
  }

  const videoBuffer = await downloadBinary(candidate.videoUrl, 120_000, {
    referer: candidate.reelUrl,
  });

  const importId = randomUUID().replace(/-/g, "").slice(0, 12);
  const key = `creator-imports/${importId}/source.mp4`;
  const storage = createAssetStorage(env);

  await storage.putObject({
    key,
    body: videoBuffer,
    mimeType: "video/mp4",
  });

  const videoUrl = `/api/assets/${key}`;
  const titleFromCaption = candidate.caption?.split("\n")[0]?.trim().slice(0, 80);
  const label =
    platform === "tiktok" ? "TikTok" : platform === "youtube" ? "YouTube Short" : "Instagram reel";

  return {
    title: titleFromCaption || `${label} ${candidate.shortcode}`,
    shortcode: candidate.shortcode,
    reelUrl: candidate.reelUrl,
    platform,
    filename: `${candidate.shortcode.replace(/[:/]/g, "_")}.mp4`,
    videoKey: key,
    videoUrl,
    durationSeconds: candidate.durationSeconds ?? null,
  };
}
