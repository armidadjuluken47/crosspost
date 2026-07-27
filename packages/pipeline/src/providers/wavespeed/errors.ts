export type WaveSpeedErrorCategory =
  | "auth"
  | "rate_limit"
  | "provider_timeout"
  | "provider_unavailable"
  | "content_block"
  | "invalid_input"
  | "malformed_response"
  | "asset_download_failed"
  | "unknown";

export class WaveSpeedError extends Error {
  readonly category: WaveSpeedErrorCategory;
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor(
    message: string,
    category: WaveSpeedErrorCategory,
    options?: { retryable?: boolean; statusCode?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "WaveSpeedError";
    this.category = category;
    this.retryable =
      options?.retryable ??
      (category === "rate_limit" ||
        category === "provider_timeout" ||
        category === "provider_unavailable");
    this.statusCode = options?.statusCode;
  }
}

export function classifyHttpError(status: number, message: string): WaveSpeedError {
  if (/(sensitive|content policy|content flagged|safety|moderation|blocked|inappropriate|nsfw|violat)/i.test(message)) {
    return new WaveSpeedError(message, "content_block", { retryable: false, statusCode: status });
  }

  if (status === 401 || status === 403) {
    return new WaveSpeedError(message, "auth", { retryable: false, statusCode: status });
  }
  if (status === 429) {
    return new WaveSpeedError(message, "rate_limit", { retryable: true, statusCode: status });
  }
  if (status === 400 || status === 422) {
    return new WaveSpeedError(message, "invalid_input", { retryable: false, statusCode: status });
  }
  if (status >= 500) {
    return new WaveSpeedError(message, "provider_unavailable", { retryable: true, statusCode: status });
  }
  return new WaveSpeedError(message, "unknown", { retryable: false, statusCode: status });
}
