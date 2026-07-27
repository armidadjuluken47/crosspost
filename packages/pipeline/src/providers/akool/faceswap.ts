import type { AppEnv } from "@crosspost/shared";
import { isProviderFetchableUrl } from "../wavespeed/resolve-media-url";

export class AkoolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AkoolError";
  }
}

type AkoolSubmitResponse = {
  data?: { _id?: string };
  code?: number;
  msg?: string;
};

type AkoolStatusItem = {
  status?: number | string;
  result_url?: string;
  url?: string;
};

type AkoolStatusResponse = {
  data?: AkoolStatusItem | AkoolStatusItem[];
  code?: number;
  msg?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCompleteStatus(status: unknown): boolean {
  return status === 2 || status === "2" || status === "completed";
}

function isFailedStatus(status: unknown): boolean {
  return status === 3 || status === "3" || status === "failed";
}

export async function submitAkoolVideoFaceSwap(
  env: AppEnv,
  input: { sourceUrl: string; targetUrl: string },
): Promise<string> {
  const token = env.AKOOL_API_TOKEN?.trim();
  if (!token) {
    throw new AkoolError("Akool is not configured (AKOOL_API_TOKEN)");
  }
  if (!isProviderFetchableUrl(input.sourceUrl) || !isProviderFetchableUrl(input.targetUrl)) {
    throw new AkoolError(
      "Express swap needs publicly reachable asset URLs (use R2_PUBLIC_BASE_URL or APP_BASE_URL with a public tunnel)",
    );
  }

  const base = env.AKOOL_API_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/api/open/v3/faceswap/video/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_url: input.sourceUrl,
      target_url: input.targetUrl,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as AkoolSubmitResponse;
  if (!response.ok) {
    throw new AkoolError(payload.msg ?? `Akool submit failed (${response.status})`);
  }

  const taskId = payload.data?._id;
  if (!taskId) {
    throw new AkoolError("Akool did not return a task id");
  }

  return taskId;
}

export async function pollAkoolVideoFaceSwap(env: AppEnv, taskId: string): Promise<string> {
  const token = env.AKOOL_API_TOKEN?.trim();
  if (!token) {
    throw new AkoolError("Akool is not configured (AKOOL_API_TOKEN)");
  }

  const base = env.AKOOL_API_BASE_URL.replace(/\/$/, "");
  const interval = env.AKOOL_POLL_INTERVAL_MS;
  const maxAttempts = env.AKOOL_MAX_POLL_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(
      `${base}/api/open/v3/faceswap/video/infov2?_id=${encodeURIComponent(taskId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const payload = (await response.json().catch(() => ({}))) as AkoolStatusResponse;
    if (!response.ok) {
      throw new AkoolError(payload.msg ?? `Akool status failed (${response.status})`);
    }

    const raw = payload.data;
    const item = Array.isArray(raw) ? raw[0] : raw;
    if (!item) {
      await sleep(interval);
      continue;
    }

    if (isCompleteStatus(item.status)) {
      const resultUrl = item.result_url ?? item.url;
      if (!resultUrl) {
        throw new AkoolError("Akool completed without a result URL");
      }
      return resultUrl;
    }

    if (isFailedStatus(item.status)) {
      throw new AkoolError("Akool face swap failed");
    }

    await sleep(interval);
  }

  throw new AkoolError("Akool face swap timed out");
}

export async function downloadRemoteMp4(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new AkoolError(`Failed to download Akool result (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
