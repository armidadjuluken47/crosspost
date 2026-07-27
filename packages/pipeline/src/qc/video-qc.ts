import type { AssetStorage } from "../storage/local";

export interface VideoQcResult {
  passed: boolean;
  payload: Record<string, unknown>;
}

export async function runVideoQc(
  storage: AssetStorage,
  input: {
    r2Key: string;
    width: number;
    height: number;
    durationSeconds: number;
    sourceDurationSeconds?: number;
  },
): Promise<VideoQcResult> {
  const exists = await storage.exists(input.r2Key);
  const aspectOk = input.width === 1080 && input.height === 1920;
  const durationOk =
    !input.sourceDurationSeconds ||
    Math.abs(input.durationSeconds - input.sourceDurationSeconds) <= 3;
  const passed = exists && aspectOk && durationOk;

  return {
    passed,
    payload: {
      checks: {
        assetExists: exists,
        mimeType: "video/mp4",
        width: input.width,
        height: input.height,
        durationSeconds: input.durationSeconds,
        exactNineSixteen: aspectOk,
        durationToleranceOk: durationOk,
      },
      passed,
    },
  };
}
