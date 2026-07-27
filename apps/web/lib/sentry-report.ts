import { randomUUID } from "node:crypto";

export function hasSentryDsn(dsn?: string | null) {
  return Boolean(dsn?.trim());
}

export async function reportSentryMessage(
  dsn: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  const match = dsn.trim().match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
  if (!match) {
    return false;
  }

  const [, publicKey, host, projectId] = match;
  const url = `https://${host}/api/${projectId}/store/?sentry_key=${publicKey}&sentry_version=7`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: randomUUID().replace(/-/g, ""),
      message: { formatted: message },
      level: "error",
      platform: "node",
      extra,
      timestamp: Date.now() / 1000,
    }),
  });

  return response.ok;
}
