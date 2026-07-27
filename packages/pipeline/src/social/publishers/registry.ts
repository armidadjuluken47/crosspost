import type { SocialOAuthAdapter, SocialPlatform, SocialPublisher } from "./types";
import { youtubeOAuth, youtubePublisher } from "./youtube";
import { tiktokOAuth, tiktokPublisher } from "./tiktok";
import { instagramOAuth, instagramPublisher } from "./instagram";

const PUBLISHERS: Record<SocialPlatform, SocialPublisher> = {
  youtube: youtubePublisher,
  tiktok: tiktokPublisher,
  instagram: instagramPublisher,
};

const OAUTH_ADAPTERS: Record<SocialPlatform, SocialOAuthAdapter> = {
  youtube: youtubeOAuth,
  tiktok: tiktokOAuth,
  instagram: instagramOAuth,
};

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["youtube", "tiktok", "instagram"];

export function isSocialPlatform(value: string): value is SocialPlatform {
  return value === "youtube" || value === "tiktok" || value === "instagram";
}

export function getPublisher(platform: SocialPlatform): SocialPublisher {
  const publisher = PUBLISHERS[platform];
  if (!publisher) throw new Error(`No publisher registered for platform ${platform}`);
  return publisher;
}

export function getOAuthAdapter(platform: SocialPlatform): SocialOAuthAdapter {
  const adapter = OAUTH_ADAPTERS[platform];
  if (!adapter) throw new Error(`No OAuth adapter registered for platform ${platform}`);
  return adapter;
}
