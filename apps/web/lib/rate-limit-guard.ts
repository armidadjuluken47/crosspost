import { NextResponse } from "next/server";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { getServerEnv } from "@/lib/env";

export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  const env = getServerEnv();
  const result = await checkRateLimit(
    `${scope}:${getClientKey(request)}`,
    limit,
    windowMs,
    env.REDIS_URL,
  );

  if (!result.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded for ${scope}` },
      { status: 429 },
    );
  }

  return null;
}
