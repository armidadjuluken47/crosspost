import type { AppEnv } from "@crosspost/shared";
import {
  SocialPublishError,
  type RefreshedToken,
  type SocialAccountInfo,
  type SocialOAuthAdapter,
  type SocialPublishResult,
  type SocialPublisher,
} from "./types";

/**
 * Instagram API with Instagram Login (Business Login).
 * Old Facebook-Login scopes (`instagram_basic`, etc.) are rejected by Meta;
 * use `instagram_business_*` + graph.instagram.com instead.
 */
const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.instagram.com/${GRAPH_VERSION}`;
const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const SHORT_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const LONG_TOKEN_URL = "https://graph.instagram.com/access_token";
const REFRESH_TOKEN_URL = "https://graph.instagram.com/refresh_access_token";
const SCOPES = ["instagram_business_basic", "instagram_business_content_publish"].join(",");
const EXPIRY_SKEW_MS = 5 * 60 * 1000;
const CONTAINER_POLL_MS = 3000;
const CONTAINER_MAX_POLLS = 60;

function requireCredentials(env: AppEnv) {
  const appId = env.META_APP_ID?.trim();
  const appSecret = env.META_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new SocialPublishError("Instagram (Meta) OAuth is not configured", "instagram");
  }
  return { appId, appSecret };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type TokenJson = {
  access_token?: string;
  expires_in?: number;
  user_id?: string | number;
  permissions?: string | string[];
  error?: { message?: string; type?: string } | string;
  error_message?: string;
  data?: Array<{
    access_token?: string;
    user_id?: string | number;
    permissions?: string | string[];
  }>;
};

function tokenErrorMessage(data: TokenJson, fallback: string | number): string {
  if (typeof data.error === "string") return data.error;
  if (data.error?.message) return data.error.message;
  if (data.error_message) return data.error_message;
  return String(fallback);
}

async function exchangeCodeForShortLivedToken(
  env: AppEnv,
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; userId: string; permissions: string }> {
  const { appId, appSecret } = requireCredentials(env);
  const response = await fetch(SHORT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const data = (await response.json()) as TokenJson;
  const row = data.data?.[0] ?? data;
  if (!response.ok || !row.access_token) {
    throw new SocialPublishError(
      `Instagram code exchange failed: ${tokenErrorMessage(data, response.status)}`,
      "instagram",
    );
  }
  const permissions = Array.isArray(row.permissions)
    ? row.permissions.join(",")
    : (row.permissions ?? SCOPES);
  return {
    accessToken: row.access_token,
    userId: row.user_id != null ? String(row.user_id) : "unknown",
    permissions,
  };
}

async function exchangeLongLivedToken(
  env: AppEnv,
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresAt: Date | null }> {
  const { appSecret } = requireCredentials(env);
  const url = new URL(LONG_TOKEN_URL);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortLivedToken);

  const response = await fetch(url);
  const data = (await response.json()) as TokenJson;
  if (!response.ok || !data.access_token) {
    throw new SocialPublishError(
      `Instagram long-lived token exchange failed: ${tokenErrorMessage(data, response.status)}`,
      "instagram",
      response.status >= 500,
    );
  }
  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}

async function refreshLongLivedToken(
  longLivedToken: string,
): Promise<{ accessToken: string; expiresAt: Date | null }> {
  const url = new URL(REFRESH_TOKEN_URL);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", longLivedToken);

  const response = await fetch(url);
  const data = (await response.json()) as TokenJson;
  if (!response.ok || !data.access_token) {
    throw new SocialPublishError(
      `Instagram token refresh failed: ${tokenErrorMessage(data, response.status)}`,
      "instagram",
      response.status >= 500,
    );
  }
  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}

async function fetchIgProfile(
  accessToken: string,
  fallbackUserId: string,
): Promise<{ igUserId: string; username: string }> {
  const url = new URL(`${GRAPH}/me`);
  url.searchParams.set("fields", "user_id,username");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url);
  const data = (await response.json()) as {
    user_id?: string | number;
    id?: string | number;
    username?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new SocialPublishError(
      `Instagram profile lookup failed: ${data.error?.message ?? response.status}`,
      "instagram",
    );
  }

  const igUserId = String(data.user_id ?? data.id ?? fallbackUserId);
  return {
    igUserId,
    username: data.username ? `@${data.username}` : "Instagram",
  };
}

export const instagramOAuth: SocialOAuthAdapter = {
  platform: "instagram",
  authorizeUrl(env, redirectUri, state) {
    const { appId } = requireCredentials(env);
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      scope: SCOPES,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  },
  async exchangeCode(env, code, redirectUri): Promise<SocialAccountInfo> {
    const shortLived = await exchangeCodeForShortLivedToken(env, code, redirectUri);
    const longLived = await exchangeLongLivedToken(env, shortLived.accessToken);
    const profile = await fetchIgProfile(longLived.accessToken, shortLived.userId);

    return {
      accountRef: profile.igUserId,
      accountLabel: profile.username,
      accessToken: longLived.accessToken,
      // Keep a copy for refresh; IG refresh uses the long-lived token itself.
      refreshToken: longLived.accessToken,
      scopes: shortLived.permissions || SCOPES,
      expiresAt: longLived.expiresAt,
      metadata: {
        igUserId: profile.igUserId,
        authMode: "instagram_login",
      },
    };
  },
};

async function pollContainerReady(creationId: string, accessToken: string) {
  for (let attempt = 0; attempt < CONTAINER_MAX_POLLS; attempt += 1) {
    const url = new URL(`${GRAPH}/${creationId}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url);
    const data = (await response.json()) as {
      status_code?: string;
      status?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new SocialPublishError(
        `Instagram container poll failed: ${data.error?.message ?? response.status}`,
        "instagram",
        response.status >= 500 || response.status === 429,
      );
    }

    const code = (data.status_code ?? "").toUpperCase();
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new SocialPublishError(
        `Instagram media container failed (${code}): ${data.status ?? "unknown"}`,
        "instagram",
      );
    }

    await sleep(CONTAINER_POLL_MS);
  }

  throw new SocialPublishError(
    "Instagram media container timed out while processing the Reel",
    "instagram",
    true,
  );
}

export const instagramPublisher: SocialPublisher = {
  platform: "instagram",

  async refreshIfNeeded(env, connection): Promise<RefreshedToken | null> {
    const stillValid =
      connection.expiresAt && connection.expiresAt.getTime() - EXPIRY_SKEW_MS > Date.now();
    if (stillValid) return null;

    const token = connection.refreshToken ?? connection.accessToken;
    if (!token) {
      throw new SocialPublishError(
        "Instagram connection has no token to refresh; reconnect the account",
        "instagram",
      );
    }

    // Prefer IG refresh; fall back to long-lived exchange if the stored token is short-lived.
    try {
      return await refreshLongLivedToken(token);
    } catch (refreshError) {
      try {
        return await exchangeLongLivedToken(env, token);
      } catch {
        throw refreshError;
      }
    }
  },

  async publish(_env, connection, input): Promise<SocialPublishResult> {
    const videoUrl = input.videoUrl?.trim();
    if (!videoUrl || !videoUrl.startsWith("https://")) {
      throw new SocialPublishError(
        "Instagram Reels require a public HTTPS video URL (use R2 / ASSET_STORAGE_MODE=r2).",
        "instagram",
      );
    }

    const caption = [input.caption, input.hashtags].filter(Boolean).join("\n\n").trim();
    const igUserId = connection.accountRef;
    const token = connection.accessToken;

    const createUrl = new URL(`${GRAPH}/${igUserId}/media`);
    const createBody = new URLSearchParams({
      media_type: "REELS",
      video_url: videoUrl,
      caption: caption.slice(0, 2200),
      access_token: token,
    });

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: createBody,
    });
    const createData = (await createResponse.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!createResponse.ok || !createData.id) {
      throw new SocialPublishError(
        `Instagram Reel container failed: ${createData.error?.message ?? createResponse.status}`,
        "instagram",
        createResponse.status >= 500 || createResponse.status === 429,
      );
    }

    await pollContainerReady(createData.id, token);

    const publishUrl = new URL(`${GRAPH}/${igUserId}/media_publish`);
    const publishBody = new URLSearchParams({
      creation_id: createData.id,
      access_token: token,
    });
    const publishResponse = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishBody,
    });
    const publishData = (await publishResponse.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!publishResponse.ok || !publishData.id) {
      throw new SocialPublishError(
        `Instagram Reel publish failed: ${publishData.error?.message ?? publishResponse.status}`,
        "instagram",
        publishResponse.status >= 500 || publishResponse.status === 429,
      );
    }

    let remotePostUrl: string | undefined;
    try {
      const permalinkUrl = new URL(`${GRAPH}/${publishData.id}`);
      permalinkUrl.searchParams.set("fields", "permalink");
      permalinkUrl.searchParams.set("access_token", token);
      const permalinkResponse = await fetch(permalinkUrl);
      const permalinkData = (await permalinkResponse.json()) as { permalink?: string };
      if (permalinkData.permalink) remotePostUrl = permalinkData.permalink;
    } catch {
      // Non-fatal.
    }

    return {
      remotePostId: publishData.id,
      remotePostUrl,
      raw: publishData,
    };
  },
};
