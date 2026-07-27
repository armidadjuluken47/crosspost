import {
  assessSchemaCompatibility,
  REGISTRY_WAVESPEED_MODEL_PATHS,
  type ProviderDefinition,
  type ProviderSelection,
} from "@crosspost/shared";
import type { AppEnv } from "@crosspost/shared";
import { findCatalogModelById } from "../providers/wavespeed/catalog";

function findProvider(providers: ProviderDefinition[], id: string): ProviderDefinition | undefined {
  return providers.find((provider) => provider.id === id);
}

export async function validateEngineProviderSelection(
  env: AppEnv,
  providers: ProviderDefinition[],
  selection: ProviderSelection,
): Promise<void> {
  const selectedIds = [...selection.imageProviderIds, selection.videoProviderId];

  for (const providerId of selectedIds) {
    const provider = findProvider(providers, providerId);
    if (!provider?.wavespeedModel) {
      throw new Error(`Provider ${providerId} is missing a WaveSpeed model ID`);
    }

    const needsSchemaValidation =
      provider.isCustom || !REGISTRY_WAVESPEED_MODEL_PATHS.has(provider.wavespeedModel);
    if (!needsSchemaValidation) {
      continue;
    }

    const catalogModel = await findCatalogModelById(env, provider.wavespeedModel);
    if (!catalogModel) {
      throw new Error(
        `WaveSpeed model "${provider.wavespeedModel}" was not found in the catalog. Check the model ID.`,
      );
    }

    const stage = provider.stage === "video_gen" ? "video_gen" : "image_gen";
    const compatibility = assessSchemaCompatibility(catalogModel, stage);
    if (compatibility.level === "unsupported") {
      throw new Error(
        `Model "${provider.wavespeedModel}" is not compatible with CrossPost: ${compatibility.reasons.join("; ")}`,
      );
    }
  }
}
