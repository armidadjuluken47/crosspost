import type { AppEnv } from "@crosspost/shared";

export type SocialPlatform = "youtube" | "tiktok" | "instagram";

/** A social_connections row with tokens already decrypted for use. */
export interface DecryptedConnection {
  id: number;
  platform: SocialPlatform;
  accountRef: string;
  accountLabel: string;
  accessToken: string;
  refreshToken: string | null;
  scopes: string | null;
  expiresAt: Date | null;
  metadata?: unknown;
}

export interface SocialPublishInput {
  videoBuffer: Buffer;
  /** Optional public URL for the output video, when storage exposes one. */
  videoUrl?: string;
  title: string;
  caption: string;
  hashtags?: string | null;
  /** Whether to flag the upload as AI-generated content where the platform supports it. */
  aigcLabel: boolean;
  privacy: "private" | "public" | "unlisted";
}

export interface SocialPublishResult {
  remotePostId: string;
  remotePostUrl?: string;
  raw?: unknown;
}

export interface RefreshedToken {
  accessToken: string;
  expiresAt: Date | null;
  refreshToken?: string | null;
}

export interface SocialAccountInfo {
  accountRef: string;
  accountLabel: string;
  accessToken: string;
  refreshToken: string | null;
  scopes: string | null;
  expiresAt: Date | null;
  metadata?: Record<string, unknown>;
}

export interface SocialOAuthAdapter {
  platform: SocialPlatform;
  authorizeUrl(env: AppEnv, redirectUri: string, state: string): string;
  exchangeCode(env: AppEnv, code: string, redirectUri: string): Promise<SocialAccountInfo>;
}

export interface SocialPublisher {
  platform: SocialPlatform;
  /**
   * Refresh the access token if expired/near expiry. Returns the new token when
   * refreshed so the caller can persist it, or null when no refresh was needed.
   */
  refreshIfNeeded(env: AppEnv, connection: DecryptedConnection): Promise<RefreshedToken | null>;
  publish(
    env: AppEnv,
    connection: DecryptedConnection,
    input: SocialPublishInput,
  ): Promise<SocialPublishResult>;
}

export class SocialPublishError extends Error {
  constructor(
    message: string,
    readonly platform: SocialPlatform,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "SocialPublishError";
  }
}
