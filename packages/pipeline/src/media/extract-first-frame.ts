import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AppEnv } from "@crosspost/shared";
import { resolveFfmpegPath } from "../ffmpeg/check";

export async function extractFirstFrameFromMp4(
  env: AppEnv,
  mp4Buffer: Buffer,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const ffmpegPath = resolveFfmpegPath(env);
  if (!ffmpegPath) {
    throw new Error("ffmpeg is required for first-frame extraction");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "amve-frame-"));
  const inputPath = join(tempDir, "input.mp4");
  const outputPath = join(tempDir, "first-frame.png");

  try {
    await writeFile(inputPath, mp4Buffer);

    const result = spawnSync(
      ffmpegPath,
      ["-y", "-i", inputPath, "-frames:v", "1", outputPath],
      { encoding: "utf8" },
    );

    if (result.status !== 0) {
      throw new Error(result.stderr || "ffmpeg first-frame extraction failed");
    }

    const buffer = await readFile(outputPath);

    const probe = spawnSync(
      ffmpegPath,
      ["-i", outputPath],
      { encoding: "utf8" },
    );
    const stderr = probe.stderr ?? "";
    const match = stderr.match(/(\d{2,5})x(\d{2,5})/);
    const width = match ? Number(match[1]) : 1080;
    const height = match ? Number(match[2]) : 1920;

    return { buffer, width, height };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
