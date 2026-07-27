import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AppEnv } from "@crosspost/shared";
import { normalizeSubtitleStyle, type SubtitleStyle } from "@crosspost/shared";
import { resolveFfmpegPath } from "../ffmpeg/check";

const FORCE_STYLES: Record<SubtitleStyle, string> = {
  minimal:
    "FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=2,Shadow=0,Alignment=2,MarginV=48",
  bold:
    "FontName=Arial Black,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Shadow=1,Alignment=2,MarginV=56,Bold=1",
  karaoke:
    "FontName=Arial,FontSize=20,PrimaryColour=&H0000FFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=52",
  boxed:
    "FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=4,Outline=0,Shadow=0,Alignment=2,MarginV=48",
};

/**
 * Burn styled captions into the video using an SRT file.
 * Soft-fail callers should catch — requires FFmpeg with subtitles/libass when available.
 */
export async function burnSubtitlesWithStyle(
  env: AppEnv,
  mp4Buffer: Buffer,
  srtContent: string,
  styleInput?: string | null,
): Promise<Buffer> {
  const style = normalizeSubtitleStyle(styleInput);
  const ffmpegPath = resolveFfmpegPath(env);
  if (!ffmpegPath) {
    throw new Error("ffmpeg is required for subtitle burn");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "cp-burn-"));
  const inputPath = join(tempDir, "input.mp4");
  const srtPath = join(tempDir, "captions.srt");
  const outputPath = join(tempDir, "burned.mp4");

  try {
    await writeFile(inputPath, mp4Buffer);
    await writeFile(srtPath, srtContent, "utf8");

    const escapedSrt = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
    const forceStyle = FORCE_STYLES[style];
    const vf = `subtitles='${escapedSrt}':force_style='${forceStyle}'`;

    const result = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inputPath,
        "-vf",
        vf,
        "-c:a",
        "copy",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
    );

    if (result.status !== 0) {
      throw new Error(result.stderr || "ffmpeg subtitle burn failed");
    }

    return readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

/** @deprecated Use burnSubtitlesWithStyle */
export async function burnMinimalSubtitles(
  env: AppEnv,
  mp4Buffer: Buffer,
  srtContent: string,
): Promise<Buffer> {
  return burnSubtitlesWithStyle(env, mp4Buffer, srtContent, "minimal");
}
