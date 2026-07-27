import type { AppEnv } from "@crosspost/shared";
import { WaveSpeedError, classifyHttpError } from "./errors";

export interface WaveSpeedTaskResult {
  taskId: string;
  status: string;
  outputs: string[];
  error?: string;
  inferenceMs?: number;
  raw: Record<string, unknown>;
}

interface WaveSpeedEnvelope {
  code?: number;
  message?: string;
  data?: {
    id?: string;
    status?: string;
    outputs?: string[] | string;
    urls?: { get?: string };
    error?: string;
    timings?: { inference?: number };
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function normalizeOutputs(outputs?: string[] | string): string[] {
  if (!outputs) return [];
  return Array.isArray(outputs) ? outputs : [outputs];
}

function parseEnvelope(body: WaveSpeedEnvelope): WaveSpeedTaskResult {
  const data = body.data;
  if (!data?.id) {
    throw new WaveSpeedError("WaveSpeed response missing task id", "malformed_response", {
      retryable: false,
    });
  }

  return {
    taskId: data.id,
    status: data.status ?? "processing",
    outputs: normalizeOutputs(data.outputs),
    error: data.error || undefined,
    inferenceMs: data.timings?.inference,
    raw: data as Record<string, unknown>,
  };
}

export async function submitWaveSpeedTask(
  env: AppEnv,
  modelPath: string,
  body: Record<string, unknown>,
): Promise<WaveSpeedTaskResult> {
  const url = `${apiRoot(env)}/${modelPath.replace(/^\//, "")}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: authHeaders(env),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(env.WAVESPEED_SUBMIT_TIMEOUT_MS),
    });
  } catch (error) {
    throw new WaveSpeedError(
      error instanceof Error ? error.message : "WaveSpeed submit failed",
      "provider_timeout",
      { retryable: true, cause: error },
    );
  }

  const json = (await response.json()) as WaveSpeedEnvelope;
  if (!response.ok || (json.code && json.code >= 400)) {
    const message = json.message ?? json.data?.error ?? `WaveSpeed submit failed (${response.status})`;
    throw classifyHttpError(response.status || json.code || 500, message);
  }

  return parseEnvelope(json);
}

export async function fetchWaveSpeedTask(
  env: AppEnv,
  taskId: string,
  pollUrl?: string,
): Promise<WaveSpeedTaskResult> {
  const url = pollUrl ?? `${apiRoot(env)}/predictions/${encodeURIComponent(taskId)}/result`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: authHeaders(env),
      signal: AbortSignal.timeout(env.WAVESPEED_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new WaveSpeedError(
      error instanceof Error ? error.message : "WaveSpeed poll failed",
      "provider_timeout",
      { retryable: true, cause: error },
    );
  }

  const json = (await response.json()) as WaveSpeedEnvelope;
  if (!response.ok || (json.code && json.code >= 400)) {
    const message = json.message ?? json.data?.error ?? `WaveSpeed poll failed (${response.status})`;
    throw classifyHttpError(response.status || json.code || 500, message);
  }

  return parseEnvelope(json);
}

export async function pollWaveSpeedTask(
  env: AppEnv,
  taskId: string,
  pollUrl?: string,
  maxPollAttempts = env.WAVESPEED_MAX_POLL_ATTEMPTS,
): Promise<WaveSpeedTaskResult> {
  const terminal = new Set(["completed", "failed", "succeeded", "error", "cancelled"]);
  let last: WaveSpeedTaskResult | null = null;

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    last = await fetchWaveSpeedTask(env, taskId, pollUrl);

    if (terminal.has(last.status)) {
      if (last.status === "failed" || last.status === "error" || last.status === "cancelled") {
        const message = last.error ?? `WaveSpeed task ${taskId} failed`;
        throw classifyHttpError(422, message);
      }

      if (last.outputs.length === 0) {
        throw new WaveSpeedError(
          `WaveSpeed task ${taskId} completed without outputs`,
          "malformed_response",
          { retryable: false },
        );
      }

      return last;
    }

    await sleep(env.WAVESPEED_POLL_INTERVAL_MS);
  }

  throw new WaveSpeedError(
    `WaveSpeed task ${taskId} timed out after ${maxPollAttempts} polls`,
    "provider_timeout",
    { retryable: true },
  );
}

export async function runWaveSpeedTask(
  env: AppEnv,
  modelPath: string,
  body: Record<string, unknown>,
  options?: { maxPollAttempts?: number },
): Promise<WaveSpeedTaskResult> {
  const submitted = await submitWaveSpeedTask(env, modelPath, body);
  if (submitted.status === "completed" && submitted.outputs.length > 0) {
    return submitted;
  }

  const pollUrl = (submitted.raw.urls as { get?: string } | undefined)?.get;
  return pollWaveSpeedTask(
    env,
    submitted.taskId,
    pollUrl,
    options?.maxPollAttempts ?? env.WAVESPEED_MAX_POLL_ATTEMPTS,
  );
}
