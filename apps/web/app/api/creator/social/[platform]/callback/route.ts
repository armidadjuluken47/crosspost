import { NextRequest, NextResponse } from "next/server";
import {
  getOAuthAdapter,
  isSocialPlatform,
  socialRedirectUri,
  upsertSocialConnection,
  verifyOAuthState,
} from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

function resolveAppBase(request: NextRequest, appBaseUrl?: string): string {
  const configured = appBaseUrl?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host");
  if (proto && host) return `${proto}://${host}`.replace(/\/$/, "");

  return request.nextUrl.origin.replace(/\/$/, "");
}

function redirectToAccount(baseUrl: string, params: Record<string, string>) {
  const url = new URL("/account", baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const env = getServerEnv();
  const appBase = resolveAppBase(request, env.APP_BASE_URL);

  const { platform } = await params;
  if (!isSocialPlatform(platform)) {
    return redirectToAccount(appBase, { social_error: "unsupported_platform" });
  }

  const searchParams = request.nextUrl.searchParams;
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return redirectToAccount(appBase, { social_error: oauthError });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return redirectToAccount(appBase, { social_error: "missing_code" });
  }

  try {
    const parsed = verifyOAuthState(env, state);
    if (!parsed) {
      return redirectToAccount(appBase, { social_error: "invalid_state" });
    }

    const redirectUri = socialRedirectUri(env, platform);
    const info = await getOAuthAdapter(platform).exchangeCode(env, code, redirectUri);

    const db = getDb();
    await upsertSocialConnection(env, db, {
      userId: parsed.uid,
      workspaceId: parsed.workspaceId,
      platform,
      info,
    });

    return redirectToAccount(appBase, { connected: platform });
  } catch (error) {
    console.error(`[social-callback] ${platform} failed:`, error);
    return redirectToAccount(appBase, { social_error: "connection_failed" });
  }
}
