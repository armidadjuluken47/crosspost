import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import type { AppEnv } from "@crosspost/shared";

const require = createRequire(import.meta.url);

function ffmpegVersionOk(ffmpegPath: string) {
  const result = spawnSync(ffmpegPath, ["-version"], { encoding: "utf8" });
  return result.status === 0;
}

export function resolveFfmpegPath(env: AppEnv): string | null {
  if (env.FFMPEG_PATH?.trim()) {
    return env.FFMPEG_PATH.trim();
  }

  const candidates: string[] = [];

  try {
    const bundled = require("ffmpeg-static") as string | null | undefined;
    if (bundled) candidates.push(bundled);
  } catch {
    // ffmpeg-static not installed in this package context
  }

  const which = spawnSync("which", ["ffmpeg"], { encoding: "utf8" });
  if (which.status === 0) {
    const systemPath = which.stdout.trim();
    if (systemPath) candidates.push(systemPath);
  }

  for (const candidate of candidates) {
    if (ffmpegVersionOk(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? null;
}

export function checkFfmpeg(env: AppEnv): { ok: boolean; path: string | null; message: string } {
  const ffmpegPath = resolveFfmpegPath(env);
  if (!ffmpegPath) {
    return { ok: false, path: null, message: "ffmpeg binary not found" };
  }

  if (!ffmpegVersionOk(ffmpegPath)) {
    const result = spawnSync(ffmpegPath, ["-version"], { encoding: "utf8" });
    return {
      ok: false,
      path: ffmpegPath,
      message: result.stderr || "ffmpeg -version failed",
    };
  }

  return { ok: true, path: ffmpegPath, message: "ffmpeg ready" };
}
