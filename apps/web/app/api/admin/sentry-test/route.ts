import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { hasSentryDsn, reportSentryMessage } from "@/lib/sentry-report";

export async function POST() {
  const env = getServerEnv();

  if (!hasSentryDsn(env.SENTRY_DSN)) {
    return NextResponse.json(
      { error: "SENTRY_DSN is not configured", configured: false },
      { status: 503 },
    );
  }

  const captured = await reportSentryMessage(
    env.SENTRY_DSN!,
    "AMVE Sentry integration test — safe to ignore",
    { source: "admin/sentry-test", environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV },
  );

  return NextResponse.json({
    ok: captured,
    message: captured
      ? "Test event sent to Sentry"
      : "Failed to send event — verify SENTRY_DSN format",
  });
}
