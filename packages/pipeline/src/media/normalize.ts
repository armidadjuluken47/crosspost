import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AppEnv } from "@crosspost/shared";
import { resolveFfmpegPath } from "../ffmpeg/check";

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;

export async function normalizeImageToNineSixteen(
  env: AppEnv,
  input: Buffer,
  dimensions?: { width?: number; height?: number },
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const targetWidth = dimensions?.width ?? TARGET_WIDTH;
  const targetHeight = dimensions?.height ?? TARGET_HEIGHT;
  const ffmpegPath = resolveFfmpegPath(env);
  if (!ffmpegPath) {
    return { buffer: input, width: targetWidth, height: targetHeight };
  }

  const tempDir = await mkdtemp(join(tmpdir(), "amve-norm-"));
  const inputPath = join(tempDir, "input.png");
  const outputPath = join(tempDir, "output.png");

  try {
    await writeFile(inputPath, input);
    const result = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inputPath,
        "-vf",
        `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}`,
        outputPath,
      ],
      { encoding: "utf8" },
    );

    if (result.status !== 0) {
      return { buffer: input, width: targetWidth, height: targetHeight };
    }

    const buffer = await readFile(outputPath);
    return { buffer, width: targetWidth, height: targetHeight };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
