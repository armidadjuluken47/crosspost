import { buildGeneratedVideoKey, type AppEnv } from "@crosspost/shared";
import { downloadBinary } from "../../ingestion/download";
import type { AssetStorage } from "../../storage/local";
import type { VideoGenerationInput, VideoGenerationResult } from "../types";
import { WaveSpeedError } from "./errors";
import { runWaveSpeedTask } from "./client";
import { ProviderMediaResolver, redactMediaUrlsForAudit } from "./resolve-media-url";

const KLING_STD_COST_CENTS = 63;

export async function generateWaveSpeedVideo(
  env: AppEnv,
  storage: AssetStorage,
  input: VideoGenerationInput,
): Promise<VideoGenerationResult> {
  const started = Date.now();
  const mediaResolver = new ProviderMediaResolver(env, storage);
  const [generatedImageUrl, sourceMp4Url] = await Promise.all([
    mediaResolver.resolve(input.generatedImageUrl),
    mediaResolver.resolve(input.sourceMp4Url, "video/mp4"),
  ]);

  const requestBody = {
    image: generatedImageUrl,
    video: sourceMp4Url,
    prompt: input.renderedPrompt,
    character_orientation: "video",
    keep_original_sound: true,
  };

  const task = await runWaveSpeedTask(env, input.providerModel, requestBody, {
    maxPollAttempts: env.WAVESPEED_VIDEO_MAX_POLL_ATTEMPTS,
  });
  const outputUrl = task.outputs[0];
  if (!outputUrl) {
    throw new WaveSpeedError("WaveSpeed video task returned no output URL", "malformed_response", {
      retryable: false,
    });
  }

  let videoBuffer: Buffer;
  try {
    videoBuffer = await downloadBinary(outputUrl, env.WAVESPEED_REQUEST_TIMEOUT_MS);
  } catch (error) {
    throw new WaveSpeedError(
      error instanceof Error ? error.message : "Failed to download WaveSpeed video output",
      "asset_download_failed",
      { retryable: true, cause: error },
    );
  }

  const r2Key = buildGeneratedVideoKey(
    input.modelSlug,
    input.sourceShortcode,
    input.runId,
    input.providerId,
  );

  const stored = await storage.putObject({
    key: r2Key,
    body: videoBuffer,
    mimeType: "video/mp4",
  });

  const latencyMs = Date.now() - started;
  const durationSeconds = input.durationSeconds ?? 5;

  return {
    providerId: input.providerId,
    providerModel: input.providerModel,
    costCents: KLING_STD_COST_CENTS,
    latencyMs,
    requestPayload: redactMediaUrlsForAudit(requestBody),
    responsePayload: {
      providerModel: input.providerModel,
      costCents: KLING_STD_COST_CENTS,
      generatedAt: new Date().toISOString(),
      taskId: task.taskId,
      outputUrl,
      video: {
        r2Key,
        mimeType: "video/mp4",
        width: 1080,
        height: 1920,
        durationSeconds,
        publicUrl: stored.publicUrl,
      },
      raw: task.raw,
    },
    video: {
      r2Key,
      mimeType: "video/mp4",
      width: 1080,
      height: 1920,
      durationSeconds,
    },
  };
}
