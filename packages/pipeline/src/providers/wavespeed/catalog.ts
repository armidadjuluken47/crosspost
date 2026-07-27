import type { AppEnv } from "@crosspost/shared";
import type { WaveSpeedCatalogModel } from "@crosspost/shared";
import { WaveSpeedError } from "./errors";

interface WaveSpeedModelsEnvelope {
  code?: number;
  message?: string;
  data?: WaveSpeedCatalogModel[];
}

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

let catalogCache: { fetchedAt: number; models: WaveSpeedCatalogModel[] } | null = null;

function apiRoot(env: AppEnv) {
  const base = env.WAVESPEED_API_BASE_URL.replace(/\/$/, "");
  return `${base}/api/v3`;
}

function authHeaders(env: AppEnv) {
  const key = env.WAVESPEED_API_KEY?.trim();
  if (!key) {
    throw new WaveSpeedError("WAVESPEED_API_KEY is required", "auth", { retryable: false });
  }

  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export function clearWaveSpeedCatalogCache() {
  catalogCache = null;
}

export async function listWaveSpeedCatalog(
  env: AppEnv,
  options?: { forceRefresh?: boolean },
): Promise<WaveSpeedCatalogModel[]> {
  if (
    !options?.forceRefresh &&
    catalogCache &&
    Date.now() - catalogCache.fetchedAt < CATALOG_CACHE_TTL_MS
  ) {
    return catalogCache.models;
  }

  let response: Response;
  try {
    response = await fetch(`${apiRoot(env)}/models`, {
      method: "GET",
      headers: authHeaders(env),
      signal: AbortSignal.timeout(env.WAVESPEED_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new WaveSpeedError(
      error instanceof Error ? error.message : "WaveSpeed catalog fetch failed",
      "provider_timeout",
      { retryable: true, cause: error },
    );
  }

  const json = (await response.json()) as WaveSpeedModelsEnvelope;
  if (!response.ok || (json.code && json.code >= 400)) {
    const message =
      json.message ?? `WaveSpeed catalog fetch failed (${response.status})`;
    throw new WaveSpeedError(message, "malformed_response", { retryable: true });
  }

  const models = Array.isArray(json.data) ? json.data : [];
  catalogCache = { fetchedAt: Date.now(), models };
  return models;
}

export async function findCatalogModelById(
  env: AppEnv,
  modelId: string,
): Promise<WaveSpeedCatalogModel | undefined> {
  const catalog = await listWaveSpeedCatalog(env);
  return catalog.find((model) => model.model_id === modelId);
}
