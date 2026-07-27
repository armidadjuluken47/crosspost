import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AppEnv } from "@crosspost/shared";
import { resolveFfmpegPath } from "../ffmpeg/check";

const MAX_EDGE_PX = 1024;
const JPEG_QUALITY = 82;
const SKIP_BELOW_BYTES = 350_000;

export async function compressImageForProvider(
  env: AppEnv,
  input: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!mimeType.startsWith("image/")) {
    return { buffer: input, mimeType };
  }

  if (input.length <= SKIP_BELOW_BYTES && mimeType === "image/jpeg") {
    return { buffer: input, mimeType };
  }

  const ffmpegPath = resolveFfmpegPath(env);
  if (!ffmpegPath) {
    return { buffer: input, mimeType };
  }

  const tempDir = await mkdtemp(join(tmpdir(), "cp-provider-img-"));
  const inputPath = join(tempDir, "input");
  const outputPath = join(tempDir, "output.jpg");

  try {
    await writeFile(inputPath, input);
    const result = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inputPath,
        "-vf",
        `scale='min(${MAX_EDGE_PX},iw)':'min(${MAX_EDGE_PX},ih)':force_original_aspect_ratio=decrease`,
        "-q:v",
        String(Math.round((100 - JPEG_QUALITY) / 4)),
        outputPath,
      ],
      { encoding: "utf8" },
    );

    if (result.status !== 0) {
      return { buffer: input, mimeType };
    }

    const compressed = await readFile(outputPath);
    if (compressed.length === 0 || compressed.length >= input.length) {
      return { buffer: input, mimeType };
    }

    return { buffer: compressed, mimeType: "image/jpeg" };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
