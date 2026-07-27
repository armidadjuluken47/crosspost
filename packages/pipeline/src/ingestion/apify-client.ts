import type { AppEnv } from "@crosspost/shared";

export type SourcePlatform = "instagram" | "tiktok" | "youtube";

export interface ApifyReelCandidate {
  shortcode: string;
  reelUrl: string;
  caption?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  durationSeconds?: number;
  videoUrl?: string;
  postedAt?: string;
  platform: SourcePlatform;
  raw: Record<string, unknown>;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function roundOptionalInt(value: number | undefined, min = 0) {
  if (value == null || !Number.isFinite(value)) return undefined;
  return Math.max(min, Math.round(value));
}

function engagementFields(item: Record<string, unknown>) {
  return {
    viewCount: roundOptionalInt(
      pickNumber(item, [
        "videoViewCount",
        "viewCount",
        "playCount",
        "views",
        "videoPlayCount",
      ]),
    ),
    likeCount: roundOptionalInt(
      pickNumber(item, [
        "likesCount",
        "likeCount",
        "likes",
        "diggCount",
        "stats.diggCount",
        "favoriteCount",
      ]),
    ),
    commentCount: roundOptionalInt(
      pickNumber(item, [
        "commentsCount",
        "commentCount",
        "comments",
        "stats.commentCount",
      ]),
    ),
  };
}

export function normalizeApifyReelItem(item: Record<string, unknown>): ApifyReelCandidate | null {
  if (typeof item.error === "string" && item.error) {
    return null;
  }

  const shortcode =
    pickString(item, ["shortCode", "shortcode"]) ??
    (() => {
      const url = pickString(item, ["url", "reelUrl", "inputUrl"]);
      if (!url) return undefined;
      const match = url.match(/\/(?:reel|reels|p)\/([^/?#]+)/i);
      return match?.[1];
    })();

  if (!shortcode || /^\d+$/.test(shortcode)) return null;

  const videoUrl = pickString(item, [
    "videoUrl",
    "downloadUrl",
    "video_url",
    "videoDownloadUrl",
    "downloadedVideo",
    "displayUrl",
  ]);

  const reelUrl =
    pickString(item, ["url", "reelUrl", "inputUrl"]) ??
    `https://www.instagram.com/reel/${shortcode}/`;

  return {
    shortcode,
    reelUrl,
    caption: pickString(item, ["caption", "text", "description"]),
    ...engagementFields(item),
    durationSeconds: roundOptionalInt(
      pickNumber(item, ["videoDuration", "duration", "durationSeconds"]),
      1,
    ),
    videoUrl,
    postedAt: pickString(item, ["timestamp", "takenAt", "postedAt", "date"]),
    platform: "instagram",
    raw: item,
  };
}

export function normalizeApifyTikTokItem(item: Record<string, unknown>): ApifyReelCandidate | null {
  if (typeof item.error === "string" && item.error) return null;

  const id =
    pickString(item, ["id", "videoId", "awemeId", "aweme_id"]) ??
    (() => {
      const url = pickString(item, ["webVideoUrl", "url", "shareUrl", "videoUrl"]);
      if (!url) return undefined;
      const match = url.match(/\/video\/(\d+)/i) ?? url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
      return match?.[1];
    })();

  if (!id) return null;

  const shortcode = `tiktok:${id}`;
  const reelUrl =
    pickString(item, ["webVideoUrl", "url", "shareUrl"]) ??
    `https://www.tiktok.com/@user/video/${id}`;

  const videoMeta =
    item.videoMeta && typeof item.videoMeta === "object"
      ? (item.videoMeta as Record<string, unknown>)
      : null;

  let videoUrl =
    pickString(item, ["videoUrl", "downloadAddr", "downloadUrl"]) ??
    (videoMeta
      ? pickString(videoMeta, ["downloadAddr", "playAddr", "url", "downloadUrl"])
      : undefined);

  // Clockworks stores downloaded MP4s in mediaUrls[]
  if (!videoUrl && Array.isArray(item.mediaUrls)) {
    const first = item.mediaUrls.find(
      (u) => typeof u === "string" && /^https?:\/\//i.test(u) && !/\.jpe?g(\?|$)/i.test(u),
    );
    if (typeof first === "string") videoUrl = first;
  }

  const views =
    pickNumber(item, ["playCount", "viewCount", "videoViewCount", "views"]) ??
    (videoMeta ? pickNumber(videoMeta, ["playCount", "viewCount"]) : undefined);
  const likes = pickNumber(item, ["diggCount", "likeCount", "likesCount", "likes"]);
  const comments = pickNumber(item, ["commentCount", "commentsCount", "comments"]);
  const duration =
    pickNumber(item, ["duration", "durationSeconds"]) ??
    (videoMeta ? pickNumber(videoMeta, ["duration"]) : undefined);

  return {
    shortcode,
    reelUrl,
    caption: pickString(item, ["text", "desc", "description", "title", "caption"]),
    viewCount: roundOptionalInt(views),
    likeCount: roundOptionalInt(likes),
    commentCount: roundOptionalInt(comments),
    durationSeconds: roundOptionalInt(duration, 1),
    videoUrl,
    postedAt: pickString(item, ["createTimeISO", "createTime", "timestamp", "postedAt"]),
    platform: "tiktok",
    raw: item,
  };
}

function extractYouTubeVideoId(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed) && !trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || undefined;
    }
    return (
      parsed.searchParams.get("v") ??
      parsed.pathname.match(/\/shorts\/([^/?#]+)/)?.[1] ??
      parsed.pathname.match(/\/embed\/([^/?#]+)/)?.[1] ??
      undefined
    );
  } catch {
    return undefined;
  }
}

function isDirectYouTubeMediaUrl(value: string | undefined): boolean {
  if (!value || !/^https?:\/\//i.test(value)) return false;
  try {
    const hostname = new URL(value).hostname;
    // Watch/Shorts page URLs are metadata, not downloadable MP4s.
    if (/(^|\.)youtube\.com$/i.test(hostname) || /(^|\.)youtu\.be$/i.test(hostname)) {
      return false;
    }
  } catch {
    return false;
  }
  return (
    /\.mp4(\?|$)/i.test(value) ||
    /api\.apify\.com\/v2\/key-value-stores\//i.test(value) ||
    /googlevideo\.com/i.test(value)
  );
}

export function normalizeApifyYouTubeItem(item: Record<string, unknown>): ApifyReelCandidate | null {
  if (typeof item.error === "string" && item.error) return null;

  const id =
    extractYouTubeVideoId(pickString(item, ["id", "videoId", "video_id"])) ??
    extractYouTubeVideoId(pickString(item, ["url", "videoUrl", "link", "input", "webVideoUrl"]));

  if (!id) return null;

  const shortcode = `youtube:${id}`;
  const reelUrl =
    pickString(item, ["url", "link", "input", "webVideoUrl"]) ??
    `https://www.youtube.com/shorts/${id}`;

  // Never treat the YouTube page URL as a downloadable video.
  const candidateVideoUrl = pickString(item, [
    "downloadedFileUrl",
    "downloadUrl",
    "videoUrl",
    "mediaUrl",
  ]);
  const videoUrl = isDirectYouTubeMediaUrl(candidateVideoUrl) ? candidateVideoUrl : undefined;

  return {
    shortcode,
    reelUrl,
    caption: pickString(item, ["title", "text", "description", "caption"]),
    ...engagementFields(item),
    durationSeconds: roundOptionalInt(
      pickNumber(item, ["duration", "lengthSeconds", "durationSeconds"]),
      1,
    ),
    videoUrl,
    postedAt: pickString(item, ["date", "uploadDate", "publishedAt", "timestamp", "postedAt"]),
    platform: "youtube",
    raw: item,
  };
}

async function resolveYouTubeDownloadUrls(
  env: AppEnv,
  candidates: ApifyReelCandidate[],
): Promise<ApifyReelCandidate[]> {
  const pending = candidates.filter((candidate) => !candidate.videoUrl);
  if (pending.length === 0) return candidates;

  const actorId =
    env.APIFY_YOUTUBE_DOWNLOADER_ACTOR_ID?.trim() || "streamers~youtube-video-downloader";

  const downloads = await runApifyActorRequest(env, actorId, {
    videos: pending.map((candidate) => ({ url: candidate.reelUrl })),
    storeInKVStore: true,
    preferredQuality: "720p",
    preferredFormat: "mp4",
  });

  const byId = new Map<string, string>();
  for (const item of downloads) {
    const id =
      extractYouTubeVideoId(pickString(item, ["id", "videoId"])) ??
      extractYouTubeVideoId(pickString(item, ["input", "url", "videoUrl"]));
    const downloadUrl = pickString(item, ["downloadedFileUrl", "downloadUrl", "videoUrl", "mediaUrl"]);
    if (id && isDirectYouTubeMediaUrl(downloadUrl)) {
      byId.set(id, downloadUrl!);
    }
  }

  return candidates.map((candidate) => {
    if (candidate.videoUrl) return candidate;
    const id = candidate.shortcode.replace(/^youtube:/, "");
    const videoUrl = byId.get(id);
    if (!videoUrl) return candidate;
    return {
      ...candidate,
      videoUrl,
      raw: {
        ...candidate.raw,
        downloadedFileUrl: videoUrl,
        downloaderActorId: actorId,
      },
    };
  });
}

async function runApifyActorRequest(
  env: AppEnv,
  actorId: string,
  input: Record<string, unknown>,
  taskId?: string | null,
): Promise<Record<string, unknown>[]> {
  const token = env.APIFY_TOKEN?.trim();
  if (!token) {
    throw new Error("APIFY_TOKEN is required for live intake");
  }

  const timeoutSeconds = env.APIFY_SYNC_TIMEOUT_SECONDS;
  const endpoint = taskId?.trim()
    ? `https://api.apify.com/v2/actor-tasks/${encodeURIComponent(taskId.trim())}/run-sync-get-dataset-items`
    : `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`;

  const url = `${endpoint}?token=${encodeURIComponent(token)}&timeout=${timeoutSeconds}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(timeoutSeconds * 1000 + 15_000),
    });
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error && error.cause instanceof Error
        ? error.cause.message
        : null;
    throw new Error(
      `Apify network error: ${error instanceof Error ? error.message : "fetch failed"}${
        cause ? ` (${cause})` : ""
      }`,
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify request failed (${response.status}): ${text.slice(0, 500)}`);
  }

  return (await response.json()) as Record<string, unknown>[];
}

async function runApifyDatasetRequest(
  env: AppEnv,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const actorId = env.APIFY_INSTAGRAM_ACTOR_ID?.trim() || "apify~instagram-reel-scraper";
  return runApifyActorRequest(env, actorId, input, env.APIFY_INSTAGRAM_TASK_ID);
}

export async function fetchApifyReelsForHandle(
  env: AppEnv,
  handle: string,
  maxReels: number,
): Promise<ApifyReelCandidate[]> {
  const items = await runApifyDatasetRequest(env, {
    username: [handle.replace(/^@/, "")],
    resultsLimit: maxReels,
  });

  return items
    .map((item) => normalizeApifyReelItem(item))
    .filter((item): item is ApifyReelCandidate => item !== null);
}

/** Clockworks TikTok scraper — profiles by username. */
export async function fetchApifyTikTokForHandle(
  env: AppEnv,
  handle: string,
  maxReels: number,
): Promise<ApifyReelCandidate[]> {
  const actorId = env.APIFY_TIKTOK_ACTOR_ID?.trim() || "clockworks~tiktok-scraper";
  const username = handle.replace(/^@/, "");
  const items = await runApifyActorRequest(env, actorId, {
    profiles: [`https://www.tiktok.com/@${username}`],
    resultsPerPage: maxReels,
    shouldDownloadVideos: true,
    shouldDownloadCovers: false,
  });

  return items
    .map((item) => normalizeApifyTikTokItem(item))
    .filter((item): item is ApifyReelCandidate => item !== null)
    .slice(0, maxReels);
}

/** YouTube Shorts metadata scrape + companion MP4 download. */
export async function fetchApifyYouTubeForHandle(
  env: AppEnv,
  handle: string,
  maxReels: number,
): Promise<ApifyReelCandidate[]> {
  const actorId = env.APIFY_YOUTUBE_ACTOR_ID?.trim() || "streamers~youtube-scraper";
  const channel = handle.replace(/^@/, "");
  const startUrls = [
    {
      url: channel.startsWith("http")
        ? channel
        : `https://www.youtube.com/@${channel}/shorts`,
    },
  ];
  // maxResults:0 focuses the scraper on Shorts instead of long-form videos.
  const items = await runApifyActorRequest(env, actorId, {
    startUrls,
    maxResults: 0,
    maxResultsShorts: maxReels,
    downloadSubtitles: false,
  });

  const candidates = items
    .map((item) => normalizeApifyYouTubeItem(item))
    .filter((item): item is ApifyReelCandidate => item !== null)
    .slice(0, maxReels);

  return resolveYouTubeDownloadUrls(env, candidates);
}

export async function fetchApifyVideosForPlatform(
  env: AppEnv,
  platform: SourcePlatform,
  handle: string,
  maxReels: number,
): Promise<ApifyReelCandidate[]> {
  if (platform === "tiktok") return fetchApifyTikTokForHandle(env, handle, maxReels);
  if (platform === "youtube") return fetchApifyYouTubeForHandle(env, handle, maxReels);
  return fetchApifyReelsForHandle(env, handle, maxReels);
}

export function isInstagramReelUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    if (!/(^|\.)instagram\.com$/i.test(parsed.hostname)) return false;
    return /\/(reel|reels|p)\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function isTikTokUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return /(^|\.)tiktok\.com$/i.test(parsed.hostname) || /(^|\.)vm\.tiktok\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

export function isYouTubeShortsUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    if (!/(^|\.)youtube\.com$/i.test(parsed.hostname) && !/(^|\.)youtu\.be$/i.test(parsed.hostname)) {
      return false;
    }
    return (
      /\/shorts\//i.test(parsed.pathname) ||
      parsed.searchParams.has("v") ||
      /(^|\.)youtu\.be$/i.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function detectSourcePlatformFromUrl(value: string): SourcePlatform | null {
  if (isInstagramReelUrl(value)) return "instagram";
  if (isTikTokUrl(value)) return "tiktok";
  if (isYouTubeShortsUrl(value)) return "youtube";
  return null;
}

/** Fetch a single Instagram reel by URL via Apify. */
export async function fetchApifyReelByUrl(
  env: AppEnv,
  reelUrl: string,
): Promise<ApifyReelCandidate> {
  const normalizedUrl = reelUrl.trim();
  if (!isInstagramReelUrl(normalizedUrl)) {
    throw new Error("Only Instagram Reel / post URLs are supported for this helper");
  }

  const items = await runApifyDatasetRequest(env, {
    username: [normalizedUrl],
    resultsLimit: 1,
  });

  const apifyError = items.find((item) => typeof item.error === "string" && item.error);
  if (apifyError) {
    const detail =
      typeof apifyError.errorDescription === "string"
        ? apifyError.errorDescription
        : String(apifyError.error);
    throw new Error(
      `Instagram reel unavailable (${detail}). Try another public Reel URL, or upload an MP4.`,
    );
  }

  const candidates = items
    .map((item) => normalizeApifyReelItem(item))
    .filter((item): item is ApifyReelCandidate => item !== null);

  const match =
    candidates.find((item) => {
      const base = normalizedUrl.split("?")[0]!;
      return item.reelUrl.includes(base) || base.includes(item.shortcode);
    }) ?? candidates[0];

  if (!match) {
    throw new Error("Apify returned no reel for that URL. Use a public Instagram Reel link.");
  }

  if (!match.videoUrl || !/^https?:\/\//i.test(match.videoUrl) || match.videoUrl.includes(".jpg")) {
    throw new Error("Apify found the reel but no downloadable MP4 URL. Try another reel or upload MP4.");
  }

  return match;
}

export async function fetchApifyTikTokByUrl(
  env: AppEnv,
  videoUrl: string,
): Promise<ApifyReelCandidate> {
  const actorId = env.APIFY_TIKTOK_ACTOR_ID?.trim() || "clockworks~tiktok-scraper";
  const items = await runApifyActorRequest(env, actorId, {
    postURLs: [videoUrl.trim()],
    resultsPerPage: 1,
    shouldDownloadVideos: true,
  });

  const match = items
    .map((item) => normalizeApifyTikTokItem(item))
    .find((item): item is ApifyReelCandidate => item !== null);

  if (!match?.videoUrl) {
    throw new Error("Apify returned no downloadable TikTok video. Try another public link or upload MP4.");
  }
  return match;
}

export async function fetchApifyYouTubeByUrl(
  env: AppEnv,
  videoUrl: string,
): Promise<ApifyReelCandidate> {
  const actorId = env.APIFY_YOUTUBE_ACTOR_ID?.trim() || "streamers~youtube-scraper";
  const items = await runApifyActorRequest(env, actorId, {
    startUrls: [{ url: videoUrl.trim() }],
    maxResults: 0,
    maxResultsShorts: 1,
  });

  let match = items
    .map((item) => normalizeApifyYouTubeItem(item))
    .find((item): item is ApifyReelCandidate => item !== null);

  // Single-URL import can skip the metadata scrape and go straight to the downloader.
  if (!match) {
    const id = extractYouTubeVideoId(videoUrl);
    if (!id) {
      throw new Error("Apify returned no YouTube Short. Try another public Shorts URL or upload MP4.");
    }
    match = {
      shortcode: `youtube:${id}`,
      reelUrl: videoUrl.trim(),
      platform: "youtube",
      raw: { input: videoUrl.trim() },
    };
  }

  const [resolved] = await resolveYouTubeDownloadUrls(env, [match]);
  if (!resolved?.videoUrl) {
    throw new Error(
      "YouTube Short found but no downloadable MP4. Try another Short or upload an MP4.",
    );
  }

  return resolved;
}

export async function fetchApifyVideoByUrl(
  env: AppEnv,
  sourceUrl: string,
): Promise<ApifyReelCandidate> {
  const platform = detectSourcePlatformFromUrl(sourceUrl);
  if (!platform) {
    throw new Error("Unsupported URL. Paste an Instagram Reel, TikTok, or YouTube Shorts link.");
  }
  if (platform === "instagram") return fetchApifyReelByUrl(env, sourceUrl);
  if (platform === "tiktok") return fetchApifyTikTokByUrl(env, sourceUrl);
  return fetchApifyYouTubeByUrl(env, sourceUrl);
}
