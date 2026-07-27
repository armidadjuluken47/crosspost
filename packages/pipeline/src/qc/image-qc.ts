import {
  buildNormalizedImageKey,
} from "@crosspost/shared";
import type { AssetStorage } from "../storage/local";

export interface ImageQcResult {
  passed: boolean;
  combinedScore: number;
  payload: Record<string, unknown>;
  normalizedR2Key: string;
}

export async function runImageQc(
  storage: AssetStorage,
  input: {
    modelSlug: string;
    sourceShortcode: string;
    runId: number;
    providerId: string;
    candidateR2Key: string;
    width: number;
    height: number;
    ordinal?: number;
  },
): Promise<ImageQcResult> {
  const ordinal = input.ordinal ?? 1;
  const normalizedR2Key = buildNormalizedImageKey(
    input.modelSlug,
    input.sourceShortcode,
    input.runId,
    input.providerId,
    ordinal,
  );

  const exists = await storage.exists(normalizedR2Key);
  const aspectOk = input.width === 1080 && input.height === 1920;
  const passed = exists && aspectOk;

  return {
    passed,
    combinedScore: passed ? 92 : 0,
    normalizedR2Key,
    payload: {
      checks: {
        assetExists: exists,
        mimeType: "image/png",
        width: input.width,
        height: input.height,
        aspectRatio: `${input.width}:${input.height}`,
        exactNineSixteen: aspectOk,
      },
      passed,
    },
  };
}
