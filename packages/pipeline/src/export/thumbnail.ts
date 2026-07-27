import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AppEnv } from "@crosspost/shared";
import { resolveFfmpegPath } from "../ffmpeg/check";

/** Extract a JPEG cover frame (~1s into the video, falling back to first frame). */
export async function extractCoverThumbnail(
  env: AppEnv,
  mp4Buffer: Buffer,
): Promise<Buffer> {
  const ffmpegPath = resolveFfmpegPath(env);
  if (!ffmpegPath) {
    throw new Error("ffmpeg is required for thumbnail extraction");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "cp-thumb-"));
  const inputPath = join(tempDir, "input.mp4");
  const outputPath = join(tempDir, "cover.jpg");

  try {
    await writeFile(inputPath, mp4Buffer);

    const attempts = [
      ["-y", "-ss", "1", "-i", inputPath, "-frames:v", "1", "-q:v", "2", outputPath],
      ["-y", "-i", inputPath, "-frames:v", "1", "-q:v", "2", outputPath],
    ] as const;

    let lastError = "ffmpeg thumbnail extraction failed";
    for (const args of attempts) {
      const result = spawnSync(ffmpegPath, [...args], { encoding: "utf8" });
      if (result.status === 0) {
        return readFile(outputPath);
      }
      lastError = result.stderr || lastError;
    }

    throw new Error(lastError);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
