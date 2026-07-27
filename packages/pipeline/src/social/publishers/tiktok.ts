import type { AppEnv } from "@crosspost/shared";
import {
  SocialPublishError,
  type RefreshedToken,
  type SocialAccountInfo,
  type SocialOAuthAdapter,
  type SocialPublishResult,
  type SocialPublisher,
} from "./types";

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name";
const INBOX_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/";
// Draft/inbox posting only needs upload scope; works with unaudited apps.
const SCOPES = ["user.info.basic", "video.upload"];
const EXPIRY_SKEW_MS = 5 * 60 * 1000;

function requireCredentials(env: AppEnv) {
  const clientKey = env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = env.TIKTOK_CLIENT_SECRET?.trim();
  if (!clientKey || !clientSecret) {
    throw new SocialPublishError("TikTok OAuth is not configured", "tiktok");
  }
  return { clientKey, clientSecret };
}

type TikTokTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function requestToken(
  env: AppEnv,
  params: Record<string, string>,
): Promise<TikTokTokenResponse> {
  const { clientKey, clientSecret } = requireCredentials(env);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      ...params,
    }),
  });
  const data = (await response.json()) as TikTokTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new SocialPublishError(
      `TikTok token request failed: ${data.error_description ?? data.error ?? response.status}`,
      "tiktok",
      response.status >= 500,
    );
  }
  return data;
}

export const tiktokOAuth: SocialOAuthAdapter = {
  platform: "tiktok",
  authorizeUrl(env, redirectUri, state) {
    const { clientKey } = requireCredentials(env);
    const params = new URLSearchParams({
      client_key: clientKey,
      scope: SCOPES.join(","),
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  },
  async exchangeCode(env, code, redirectUri): Promise<SocialAccountInfo> {
    const token = await requestToken(env, {
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    let displayName = "TikTok account";
    try {
      const infoResponse = await fetch(USER_INFO_URL, {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const info = (await infoResponse.json()) as {
        data?: { user?: { display_name?: string } };
      };
      if (info.data?.user?.display_name) displayName = info.data.user.display_name;
    } catch {
      // Non-fatal; keep default label.
    }

    return {
      accountRef: token.open_id ?? "unknown",
      accountLabel: displayName,
      accessToken: token.access_token!,
      refreshToken: token.refresh_token ?? null,
      scopes: token.scope ?? SCOPES.join(","),
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    };
  },
};

export const tiktokPublisher: SocialPublisher = {
  platform: "tiktok",

  async refreshIfNeeded(env, connection): Promise<RefreshedToken | null> {
    const stillValid =
      connection.expiresAt && connection.expiresAt.getTime() - EXPIRY_SKEW_MS > Date.now();
    if (stillValid) return null;
    if (!connection.refreshToken) {
      throw new SocialPublishError(
        "TikTok connection has no refresh token; reconnect the account",
        "tiktok",
      );
    }
    const token = await requestToken(env, {
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    });
    return {
      accessToken: token.access_token!,
      refreshToken: token.refresh_token ?? connection.refreshToken,
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    };
  },

  async publish(_env, connection, input): Promise<SocialPublishResult> {
    const size = input.videoBuffer.length;

    // MVP: single-chunk whole-file upload to the creator's inbox (draft). The
    // creator finalizes the post (and sets the AI-generated label) in the app.
    const initResponse = await fetch(INBOX_INIT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        source_info: {
          source: "FILE_UPLOAD",
          video_size: size,
          chunk_size: size,
          total_chunk_count: 1,
        },
      }),
    });

    const initData = (await initResponse.json().catch(() => ({}))) as {
      data?: { publish_id?: string; upload_url?: string };
      error?: { code?: string; message?: string };
    };

    if (!initResponse.ok || !initData.data?.upload_url || !initData.data.publish_id) {
      throw new SocialPublishError(
        `TikTok upload init failed (${initResponse.status}): ${
          initData.error?.message ?? "unknown"
        }`,
        "tiktok",
        initResponse.status >= 500 || initResponse.status === 429,
      );
    }

    const uploadResponse = await fetch(initData.data.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(size),
        "Content-Range": `bytes 0-${size - 1}/${size}`,
      },
      body: new Uint8Array(input.videoBuffer),
    });

    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text().catch(() => "");
      throw new SocialPublishError(
        `TikTok upload failed (${uploadResponse.status}): ${detail.slice(0, 300)}`,
        "tiktok",
        uploadResponse.status >= 500 || uploadResponse.status === 429,
      );
    }

    return {
      remotePostId: initData.data.publish_id,
      // Draft lands in the TikTok app inbox; there is no public URL yet.
      remotePostUrl: undefined,
      raw: initData.data,
    };
  },
};
