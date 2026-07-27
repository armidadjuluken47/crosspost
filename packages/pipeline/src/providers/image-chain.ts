import {
  formatImageProviderFailure,
  summarizeImageProviderChainFailure,
  getEnabledProviders,
  getProviderById,
  type AppEnv,
  type ProviderDefinition,
} from "@crosspost/shared";
import type { AssetStorage } from "../storage/local";
import { generateFixtureImage } from "./fixture-image";
import { WaveSpeedError } from "./wavespeed/errors";
import { generateWaveSpeedImage } from "./wavespeed/generate-image";
import type { ImageGenerationInput, ImageGenerationResult } from "./types";

export class ImageProviderError extends Error {
  constructor(
    message: string,
    readonly providerId: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ImageProviderError";
  }
}

export async function runImageGenerationChain(
  env: AppEnv,
  storage: AssetStorage,
  baseInput: Omit<ImageGenerationInput, "providerId" | "providerModel">,
  providers: ProviderDefinition[] = getEnabledProviders("image_gen"),
): Promise<ImageGenerationResult> {
  const errors: string[] = [];
  const attempts: Array<{ providerId: string; error: string }> = [];

  for (const provider of providers) {
    try {
      const input: ImageGenerationInput = {
        ...baseInput,
        providerId: provider.id,
        providerModel: provider.wavespeedModel ?? provider.id,
      };

      if (env.IMAGE_PROVIDER_MODE === "fixture") {
        return await generateFixtureImage(env, storage, input);
      }

      try {
        const result = await generateWaveSpeedImage(env, storage, input);
        return {
          ...result,
          responsePayload: {
            ...result.responsePayload,
            ...(errors.length > 0
              ? {
                  providerChainErrors: errors,
                  providerAttempts: attempts,
                }
              : {}),
          },
        };
      } catch (error) {
        if (error instanceof WaveSpeedError) {
          throw new ImageProviderError(error.message, provider.id, error.retryable);
        }
        throw error;
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Unknown image provider error";
      const message = formatImageProviderFailure(provider.id, rawMessage);
      errors.push(message);
      attempts.push({ providerId: provider.id, error: rawMessage });
      if (error instanceof ImageProviderError && !error.retryable) {
        continue;
      }
    }
  }

  throw new ImageProviderError(
    summarizeImageProviderChainFailure(errors),
    providers[0]?.id ?? "unknown",
    false,
  );
}

export function getSuccessfulImageProviderId(result: ImageGenerationResult): string {
  return result.providerId;
}

export function getProviderModel(providerId: string): string {
  return getProviderById(providerId)?.wavespeedModel ?? providerId;
}
