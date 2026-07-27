import { getEnabledProviders, type AppEnv, type ProviderDefinition } from "@crosspost/shared";
import type { AssetStorage } from "../storage/local";
import { generateFixtureVideo } from "./fixture-video";
import { WaveSpeedError } from "./wavespeed/errors";
import { generateWaveSpeedVideo } from "./wavespeed/generate-video";
import type { VideoGenerationInput, VideoGenerationResult } from "./types";

export class VideoProviderError extends Error {
  constructor(message: string, readonly providerId: string) {
    super(message);
    this.name = "VideoProviderError";
  }
}

export async function runVideoGeneration(
  env: AppEnv,
  storage: AssetStorage,
  baseInput: Omit<VideoGenerationInput, "providerId" | "providerModel">,
  provider: ProviderDefinition | undefined = getEnabledProviders("video_gen")[0],
): Promise<VideoGenerationResult> {
  if (!provider) {
    throw new VideoProviderError("No enabled video provider", "none");
  }

  const input: VideoGenerationInput = {
    ...baseInput,
    providerId: provider.id,
    providerModel: provider.wavespeedModel ?? provider.id,
  };

  if (env.VIDEO_PROVIDER_MODE === "fixture") {
    return generateFixtureVideo(env, storage, input);
  }

  // Transient failures (network "fetch failed", provider_unavailable, rate_limit,
  // asset download hiccups) are common with long-running video jobs. Retry a few
  // times with backoff so identical inputs don't randomly fail on a network blip.
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await generateWaveSpeedVideo(env, storage, input);
    } catch (error) {
      lastError = error;

      const retryable = error instanceof WaveSpeedError && error.retryable;
      if (!retryable || attempt === maxAttempts) {
        break;
      }

      const backoffMs = 1500 * attempt;
      console.warn(
        `[video-provider] ${provider.id} attempt ${attempt}/${maxAttempts} failed (${
          error instanceof Error ? error.message : "unknown"
        }) — retrying in ${backoffMs}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  if (lastError instanceof WaveSpeedError) {
    throw new VideoProviderError(lastError.message, provider.id);
  }
  throw lastError;
}
