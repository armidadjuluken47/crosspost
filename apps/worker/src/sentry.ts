import type { AppEnv } from "@crosspost/shared";

let initialized = false;

export function hasSentryDsn(env: Pick<AppEnv, "SENTRY_DSN">) {
  return Boolean(env.SENTRY_DSN?.trim());
}

export async function initSentry(env: Pick<AppEnv, "SENTRY_DSN" | "SENTRY_ENVIRONMENT" | "NODE_ENV">) {
  if (initialized || !hasSentryDsn(env)) {
    return false;
  }

  const Sentry = await import("@sentry/node");
  Sentry.init({
    dsn: env.SENTRY_DSN!.trim(),
    environment: env.SENTRY_ENVIRONMENT?.trim() || env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
  initialized = true;
  return true;
}

export async function captureSentryException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return false;

  const Sentry = await import("@sentry/node");
  if (context) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }

  await Sentry.flush(2_000);
  return true;
}
