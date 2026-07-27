import type { AppEnv } from "@crosspost/shared";
import {
  SocialPublishError,
  type RefreshedToken,
  type SocialAccountInfo,
  type SocialOAuthAdapter,
  type SocialPublishResult,
  type SocialPublisher,
} from "./types";

const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const AUTHORIZE_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
].join(",");
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
  error?: { message?: string; type?: string };
};

async function exchangeCode(
  env: AppEnv,
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; expiresAt: Date | null }> {
  const { appId, appSecret } = requireCredentials(env);
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const response = await fetch(url);
  const data = (await response.json()) as TokenJson;
  if (!response.ok || !data.access_token) {
    throw new SocialPublishError(
      `Instagram code exchange failed: ${data.error?.message ?? response.status}`,
      "instagram",
    );
  }
  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}

async function exchangeLongLivedUserToken(
  env: AppEnv,
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresAt: Date | null }> {
  const { appId, appSecret } = requireCredentials(env);
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url);
  const data = (await response.json()) as TokenJson;
  if (!response.ok || !data.access_token) {
    throw new SocialPublishError(
      `Instagram long-lived token exchange failed: ${data.error?.message ?? response.status}`,
      "instagram",
      response.status >= 500,
    );
  }
  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}

type PageRow = {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: { id?: string; username?: string };
};

async function findInstagramBusinessAccount(
  userAccessToken: string,
): Promise<{
  igUserId: string;
  username: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
}> {
  const url = new URL(`${GRAPH}/me/accounts`);
  url.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username}",
  );
  url.searchParams.set("access_token", userAccessToken);

  const response = await fetch(url);
  const data = (await response.json()) as {
    data?: PageRow[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new SocialPublishError(
      `Instagram pages lookup failed: ${data.error?.message ?? response.status}`,
      "instagram",
    );
  }

  const withIg = (data.data ?? []).filter(
    (page) => page.instagram_business_account?.id && page.access_token,
  );
  if (withIg.length === 0) {
    throw new SocialPublishError(
      "No Instagram Professional account linked to a Facebook Page was found. " +
        "Switch the IG account to Business/Creator and link a Page, then reconnect.",
      "instagram",
    );
  }

  // MVP: first linked IG Business/Creator account.
  const page = withIg[0]!;
  const ig = page.instagram_business_account!;
  return {
    igUserId: ig.id!,
    username: ig.username ? `@${ig.username}` : "Instagram",
    pageId: page.id!,
    pageName: page.name ?? "Facebook Page",
    pageAccessToken: page.access_token!,
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
    const shortLived = await exchangeCode(env, code, redirectUri);
    const longLived = await exchangeLongLivedUserToken(env, shortLived.accessToken);
    const account = await findInstagramBusinessAccount(longLived.accessToken);

    return {
      accountRef: account.igUserId,
      accountLabel: account.username,
      // Page tokens derived from long-lived user tokens typically do not expire.
      accessToken: account.pageAccessToken,
      refreshToken: longLived.accessToken,
      scopes: SCOPES,
      expiresAt: null,
      metadata: {
        pageId: account.pageId,
        pageName: account.pageName,
        igUserId: account.igUserId,
        userTokenExpiresAt: longLived.expiresAt?.toISOString() ?? null,
      },
    };
  },
};

async function pollContainerReady(creationId: string, pageAccessToken: string) {
  for (let attempt = 0; attempt < CONTAINER_MAX_POLLS; attempt += 1) {
    const url = new URL(`${GRAPH}/${creationId}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", pageAccessToken);

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
    // Page tokens from a long-lived user token are effectively permanent.
    // Refresh the user token when we have an expiry in metadata and it's near.
    const meta = (connection.metadata ?? {}) as {
      userTokenExpiresAt?: string | null;
    };
    const userExpiry = meta.userTokenExpiresAt ? new Date(meta.userTokenExpiresAt) : null;
    const stillValid =
      !userExpiry || userExpiry.getTime() - EXPIRY_SKEW_MS > Date.now();
    if (stillValid || !connection.refreshToken) return null;

    const longLived = await exchangeLongLivedUserToken(env, connection.refreshToken);
    const account = await findInstagramBusinessAccount(longLived.accessToken);

    return {
      accessToken: account.pageAccessToken,
      refreshToken: longLived.accessToken,
      expiresAt: null,
    };
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
