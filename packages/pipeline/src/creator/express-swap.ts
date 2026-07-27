import type { AppEnv } from "@crosspost/shared";
import {
  buildCreatorProjectFaceKey,
  buildCreatorProjectOutputKey,
  hasAkoolCredentials,
} from "@crosspost/shared";
import type { AssetStorage } from "../storage/local";
import { isProviderFetchableUrl } from "../providers/wavespeed/resolve-media-url";
import {
  AkoolError,
  downloadRemoteMp4,
  pollAkoolVideoFaceSwap,
  submitAkoolVideoFaceSwap,
} from "../providers/akool/faceswap";

function assetPublicUrl(env: AppEnv, storage: AssetStorage, key: string): string | null {
  const fromStorage = storage.getPublicUrl(key);
  if (fromStorage && isProviderFetchableUrl(fromStorage)) {
    return fromStorage;
  }

  const base =
    env.APP_BASE_URL?.replace(/\/$/, "") ??
    env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    env.LOCAL_ASSET_PUBLIC_BASE_URL?.replace(/\/$/, "");

  if (!base) return null;

  if (base.includes("/api/assets")) {
    const url = `${base}/${key}`;
    return isProviderFetchableUrl(url) ? url : null;
  }

  const url = `${base}/api/assets/${key}`;
  return isProviderFetchableUrl(url) ? url : null;
}

export function isExpressSwapAvailable(env: AppEnv): boolean {
  return hasAkoolCredentials(env);
}

export async function runCreatorExpressSwap(
  env: AppEnv,
  storage: AssetStorage,
  input: {
    publicId: string;
    facePhoto: { buffer: Buffer; mimeType: string };
    sourceVideoKey: string;
  },
): Promise<{ outputVideoKey: string }> {
  if (!isExpressSwapAvailable(env)) {
    throw new AkoolError("Express swap is not configured");
  }

  const faceKey = buildCreatorProjectFaceKey(input.publicId);
  await storage.putObject({
    key: faceKey,
    body: input.facePhoto.buffer,
    mimeType: input.facePhoto.mimeType || "image/jpeg",
  });

  const faceUrl = assetPublicUrl(env, storage, faceKey);
  const videoUrl = assetPublicUrl(env, storage, input.sourceVideoKey);
  if (!faceUrl || !videoUrl) {
    throw new AkoolError(
      "Express swap needs publicly reachable URLs for face and video (configure R2_PUBLIC_BASE_URL or APP_BASE_URL)",
    );
  }

  const taskId = await submitAkoolVideoFaceSwap(env, {
    sourceUrl: faceUrl,
    targetUrl: videoUrl,
  });
  const resultUrl = await pollAkoolVideoFaceSwap(env, taskId);
  const mp4 = await downloadRemoteMp4(resultUrl);

  const outputVideoKey = buildCreatorProjectOutputKey(input.publicId);
  await storage.putObject({
    key: outputVideoKey,
    body: mp4,
    mimeType: "video/mp4",
  });

  return { outputVideoKey };
}
