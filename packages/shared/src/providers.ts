export type ProviderStage = "image_gen" | "video_gen" | "ingestion";

export type ProviderStatus = "ok" | "fixture" | "missing_credentials" | "disabled";

export interface ProviderDefinition {
  id: string;
  displayName: string;
  stage: ProviderStage;
  wavespeedModel: string | null;
  sortOrder: number;
  enabled: boolean;
  isPremiumSlot?: boolean;
  /** True when added from WaveSpeed catalog (not hard-coded registry). */
  isCustom?: boolean;
}

export const IMAGE_PROVIDER_CHAIN: ProviderDefinition[] = [
  {
    id: "wavespeed_nano_banana_2",
    displayName: "WaveSpeed Nano Banana 2",
    stage: "image_gen",
    wavespeedModel: "google/nano-banana-2/edit",
    sortOrder: 1,
    enabled: true,
  },
  {
    id: "wavespeed_nano_banana_pro",
    displayName: "WaveSpeed Nano Banana Pro",
    stage: "image_gen",
    wavespeedModel: "google/nano-banana-pro/edit-multi",
    sortOrder: 2,
    enabled: true,
  },
  {
    id: "wavespeed_flux_kontext_max",
    displayName: "WaveSpeed Flux Kontext Max",
    stage: "image_gen",
    wavespeedModel: "wavespeed-ai/flux-kontext-max/multi",
    sortOrder: 3,
    enabled: false,
  },
  {
    id: "wavespeed_seedream_v45",
    displayName: "WaveSpeed Seedream v4.5",
    stage: "image_gen",
    wavespeedModel: "bytedance/seedream-v4.5/edit",
    sortOrder: 4,
    enabled: true,
  },
];

export const VIDEO_PROVIDER_CHAIN: ProviderDefinition[] = [
  {
    id: "wavespeed_kling_v3_standard",
    displayName: "WaveSpeed Kling v3 Standard",
    stage: "video_gen",
    wavespeedModel: "kwaivgi/kling-v3.0-std/motion-control",
    sortOrder: 1,
    enabled: true,
  },
  {
    id: "wavespeed_kling_v3_pro",
    displayName: "WaveSpeed Kling v3 Pro",
    stage: "video_gen",
    wavespeedModel: "kwaivgi/kling-v3.0-pro/motion-control",
    sortOrder: 2,
    enabled: false,
    isPremiumSlot: true,
  },
];

export const ALL_PROVIDERS: ProviderDefinition[] = [
  ...IMAGE_PROVIDER_CHAIN,
  ...VIDEO_PROVIDER_CHAIN,
];

export const REGISTRY_WAVESPEED_MODEL_PATHS = new Set(
  ALL_PROVIDERS.map((provider) => provider.wavespeedModel).filter(
    (model): model is string => Boolean(model),
  ),
);

const REGISTRY_IDS = new Set(ALL_PROVIDERS.map((provider) => provider.id));

export function isRegistryProviderId(id: string): boolean {
  return REGISTRY_IDS.has(id);
}


export function getEnabledProviders(stage?: ProviderStage): ProviderDefinition[] {
  return ALL_PROVIDERS.filter(
    (provider) => provider.enabled && (!stage || provider.stage === stage),
  ).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getProviderById(id: string): ProviderDefinition | undefined {
  return ALL_PROVIDERS.find((provider) => provider.id === id);
}
