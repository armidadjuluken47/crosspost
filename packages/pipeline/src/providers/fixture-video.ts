import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildGeneratedVideoKey } from "@crosspost/shared";
import type { AppEnv } from "@crosspost/shared";
import { resolveFfmpegPath } from "../ffmpeg/check";
import type { AssetStorage } from "../storage/local";
import type { VideoGenerationInput, VideoGenerationResult } from "./types";

async function createFixtureMp4(env: AppEnv, durationSeconds: number): Promise<Buffer> {
  const ffmpegPath = resolveFfmpegPath(env);
  if (!ffmpegPath) {
    return Buffer.from("fixture-video");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "amve-video-"));
  const outputPath = join(tempDir, "output.mp4");

  try {
    const result = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=black:s=1080x1920:d=${durationSeconds}`,
        "-pix_fmt",
        "yuv420p",
        outputPath,
      ],
      { encoding: "utf8" },
    );

    if (result.status !== 0) {
      return Buffer.from("fixture-video");
    }

    return await readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function generateFixtureVideo(
  env: AppEnv,
  storage: AssetStorage,
  input: VideoGenerationInput,
): Promise<VideoGenerationResult> {
  const started = Date.now();
  const durationSeconds = input.durationSeconds ?? 5;
  const videoBuffer = await createFixtureMp4(env, durationSeconds);
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

  return {
    providerId: input.providerId,
    providerModel: input.providerModel,
    costCents: 55,
    latencyMs,
    requestPayload: {
      mode: "fixture",
      generatedImageUrl: input.generatedImageUrl,
      sourceMp4Url: input.sourceMp4Url,
      renderedPrompt: input.renderedPrompt,
    },
    responsePayload: {
      providerModel: input.providerModel,
      costCents: 55,
      generatedAt: new Date().toISOString(),
      video: {
        r2Key,
        mimeType: "video/mp4",
        width: 1080,
        height: 1920,
        durationSeconds,
        publicUrl: stored.publicUrl,
      },
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
