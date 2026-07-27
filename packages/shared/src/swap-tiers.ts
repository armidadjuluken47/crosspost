export const SWAP_TIERS = ["quality", "express"] as const;

export type SwapTier = (typeof SWAP_TIERS)[number];

export const SWAP_TIER_LABELS: Record<SwapTier, string> = {
  quality: "Quality (WaveSpeed)",
  express: "Express (Akool)",
};

export function normalizeSwapTier(value: unknown): SwapTier {
  if (typeof value === "string" && SWAP_TIERS.includes(value as SwapTier)) {
    return value as SwapTier;
  }
  return "quality";
}
