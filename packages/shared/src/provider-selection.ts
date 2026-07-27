import { z } from "zod";
import {
  getProviderById,
  isRegistryProviderId,
  type ProviderDefinition,
  type ProviderStage,
} from "./providers";

export const providerSelectionSchema = z.object({
  imageProviderIds: z.array(z.string().min(1)).min(1),
  videoProviderId: z.string().min(1),
});

export type ProviderSelection = z.infer<typeof providerSelectionSchema>;

export const providerDefinitionSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  stage: z.enum(["image_gen", "video_gen", "ingestion"]),
  wavespeedModel: z.string().nullable(),
  sortOrder: z.number().int(),
  enabled: z.boolean(),
  isPremiumSlot: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});

export function getDefaultProviderSelection(
  providers: ProviderDefinition[],
): ProviderSelection {
  const imageProviderIds = providers
    .filter((provider) => provider.stage === "image_gen" && provider.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((provider) => provider.id);

  const videoProviderId =
    providers
      .filter((provider) => provider.stage === "video_gen" && provider.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id ?? "wavespeed_kling_v3_standard";

  return { imageProviderIds, videoProviderId };
}

export function findProviderById(
  providers: ProviderDefinition[],
  id: string,
): ProviderDefinition | undefined {
  return providers.find((provider) => provider.id === id);
}

export function validateProviderSelection(
  selection: ProviderSelection,
  providers?: ProviderDefinition[],
) {
  const parsed = providerSelectionSchema.parse(selection);
  const seen = new Set<string>();

  for (const id of parsed.imageProviderIds) {
    if (seen.has(id)) {
      throw new Error(`Duplicate image provider: ${id}`);
    }
    seen.add(id);

    const provider = providers
      ? findProviderById(providers, id)
      : getProviderById(id);
    if (!provider || provider.stage !== "image_gen") {
      throw new Error(`Unknown image provider: ${id}`);
    }
    if (!provider.wavespeedModel) {
      throw new Error(`Image provider ${id} is missing a WaveSpeed model ID`);
    }
  }

  const videoProvider = providers
    ? findProviderById(providers, parsed.videoProviderId)
    : getProviderById(parsed.videoProviderId);
  if (!videoProvider || videoProvider.stage !== "video_gen") {
    throw new Error(`Unknown video provider: ${parsed.videoProviderId}`);
  }
  if (!videoProvider.wavespeedModel) {
    throw new Error(`Video provider ${parsed.videoProviderId} is missing a WaveSpeed model ID`);
  }

  return parsed;
}

export function groupProvidersByStage(providers: ProviderDefinition[]) {
  return {
    image: providers
      .filter((provider) => provider.stage === "image_gen")
      .sort((a, b) => a.sortOrder - b.sortOrder),
    video: providers
      .filter((provider) => provider.stage === "video_gen")
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function assertProviderStage(
  id: string,
  stage: ProviderStage,
  providers?: ProviderDefinition[],
) {
  const provider = providers ? findProviderById(providers, id) : getProviderById(id);
  if (!provider || provider.stage !== stage) {
    throw new Error(`Provider ${id} is not valid for stage ${stage}`);
  }
  return provider;
}

export function isCustomProviderId(id: string): boolean {
  return id.startsWith("custom_") || !isRegistryProviderId(id);
}
