import type { AppEnv } from "@crosspost/shared";
import {
  SocialPublishError,
  type DecryptedConnection,
  type RefreshedToken,
  type SocialAccountInfo,
  type SocialOAuthAdapter,
  type SocialPublishInput,
  type SocialPublishResult,
  type SocialPublisher,
} from "./types";

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];
// Refresh a bit before actual expiry to avoid mid-upload 401s.
const EXPIRY_SKEW_MS = 5 * 60 * 1000;

function requireCredentials(env: AppEnv) {
  const clientId = env.YOUTUBE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = env.YOUTUBE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new SocialPublishError("YouTube OAuth is not configured", "youtube");
  }
  return { clientId, clientSecret };
}

async function refreshAccessToken(
  env: AppEnv,
  refreshToken: string,
): Promise<RefreshedToken> {
  const { clientId, clientSecret } = requireCredentials(env);
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new SocialPublishError(
      `YouTube token refresh failed: ${data.error ?? response.status}`,
      "youtube",
      response.status >= 500,
    );
  }
  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}

export const youtubeOAuth: SocialOAuthAdapter = {
  platform: "youtube",
  authorizeUrl(env, redirectUri, state) {
    const { clientId } = requireCredentials(env);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      state,
    });
    return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  },
  async exchangeCode(env, code, redirectUri): Promise<SocialAccountInfo> {
    const { clientId, clientSecret } = requireCredentials(env);
    const tokenResponse = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const token = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
    };
    if (!tokenResponse.ok || !token.access_token) {
      throw new SocialPublishError(
        `YouTube code exchange failed: ${token.error ?? tokenResponse.status}`,
        "youtube",
      );
    }

    const channelResponse = await fetch(CHANNELS_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const channel = (await channelResponse.json()) as {
      items?: Array<{ id?: string; snippet?: { title?: string } }>;
    };
    const item = channel.items?.[0];

    return {
      accountRef: item?.id ?? "unknown",
      accountLabel: item?.snippet?.title ?? "YouTube channel",
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      scopes: token.scope ?? SCOPES.join(" "),
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    };
  },
};

export const youtubePublisher: SocialPublisher = {
  platform: "youtube",

  async refreshIfNeeded(env, connection): Promise<RefreshedToken | null> {
    const stillValid =
      connection.expiresAt && connection.expiresAt.getTime() - EXPIRY_SKEW_MS > Date.now();
    if (stillValid) return null;
    if (!connection.refreshToken) {
      throw new SocialPublishError(
        "YouTube connection has no refresh token; reconnect the account",
        "youtube",
      );
    }
    return refreshAccessToken(env, connection.refreshToken);
  },

  async publish(env, connection, input): Promise<SocialPublishResult> {
    const description = [input.caption, input.hashtags].filter(Boolean).join("\n\n").trim();

    const metadata = {
      snippet: {
        title: input.title.slice(0, 100) || "Untitled",
        description: description.slice(0, 5000),
        categoryId: "22",
      },
      status: {
        privacyStatus: input.privacy === "public" ? "public" : input.privacy,
        selfDeclaredMadeForKids: false,
      },
    };

    // Step 1: open a resumable upload session.
    const initResponse = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(input.videoBuffer.length),
      },
      body: JSON.stringify(metadata),
    });

    if (!initResponse.ok) {
      const detail = await initResponse.text();
      throw new SocialPublishError(
        `YouTube upload init failed (${initResponse.status}): ${detail.slice(0, 300)}`,
        "youtube",
        initResponse.status >= 500 || initResponse.status === 429,
      );
    }

    const uploadUrl = initResponse.headers.get("location");
    if (!uploadUrl) {
      throw new SocialPublishError("YouTube upload init returned no upload URL", "youtube", true);
    }

    // Step 2: upload the bytes.
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(input.videoBuffer.length),
      },
      body: new Uint8Array(input.videoBuffer),
    });

    const result = (await uploadResponse.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };

    if (!uploadResponse.ok || !result.id) {
      throw new SocialPublishError(
        `YouTube upload failed (${uploadResponse.status}): ${result.error?.message ?? "unknown"}`,
        "youtube",
        uploadResponse.status >= 500 || uploadResponse.status === 429,
      );
    }

    return {
      remotePostId: result.id,
      remotePostUrl: `https://youtu.be/${result.id}`,
      raw: result,
    };
  },
};
