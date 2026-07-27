const CONTENT_BLOCK_PATTERN =
  /sensitive|content policy|content flagged|safety|moderation|blocked|inappropriate|nsfw|violat/i;

export function isWaveSpeedContentBlockMessage(message: string): boolean {
  return CONTENT_BLOCK_PATTERN.test(message);
}

export function formatImageProviderFailure(providerId: string, message: string): string {
  if (isWaveSpeedContentBlockMessage(message)) {
    return `${providerId}: Google safety filter blocked this reel — trying the next image model.`;
  }

  if (/timed out/i.test(message)) {
    return `${providerId}: WaveSpeed timed out — trying the next image model.`;
  }

  return `${providerId}: ${message}`;
}

export function summarizeImageProviderChainFailure(errors: string[]): string {
  if (errors.length === 0) {
    return "All image providers failed for this reel.";
  }

  const triedContentBlock = errors.some((row) => isWaveSpeedContentBlockMessage(row));
  const triedSeedream = errors.some((row) => row.startsWith("wavespeed_seedream"));

  if (triedContentBlock && triedSeedream) {
    return `Image generation failed after trying all models. Google blocked the primary models; Seedream fallback also failed. ${errors.join(" | ")}`;
  }

  if (triedContentBlock) {
    return `Image generation blocked by Google safety filters on primary models. ${errors.join(" | ")}`;
  }

  return errors.join(" | ");
}
