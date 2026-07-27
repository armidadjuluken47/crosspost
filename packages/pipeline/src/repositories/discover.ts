import { and, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { sourceAccounts, sourceReels } from "@crosspost/db";

export type DiscoverReelRow = {
  shortcode: string;
  reelUrl: string;
  caption: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  durationSeconds: number | null;
  handle: string;
  platform: string;
  thumbnailKey: string | null;
  thumbnailPublicUrl: string | null;
  videoPublicUrl: string | null;
  mp4Key: string | null;
  postedAt: string | null;
  trendingScore: number;
};

export type DiscoverQuery = {
  limit?: number;
  q?: string;
  handle?: string;
  platform?: "instagram" | "tiktok" | "youtube" | "all";
  sort?: "views" | "likes" | "recent" | "trending";
};

const trendingScoreExpr = sql<number>`(
  coalesce(${sourceReels.viewCount}, 0)::float
  + coalesce(${sourceReels.likeCount}, 0) * 10
  + coalesce(${sourceReels.commentCount}, 0) * 5
) / greatest(
  1,
  extract(epoch from (now() - coalesce(${sourceReels.postedAt}, ${sourceReels.ingestedAt}))) / 86400
)`;

function tokenFilters(query: string) {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) return [];

  return tokens.map((token) =>
    or(
      ilike(sourceReels.caption, `%${token}%`),
      ilike(sourceAccounts.handle, `%${token}%`),
      ilike(sourceReels.reelUrl, `%${token}%`),
    )!,
  );
}

export async function listDiscoverableReels(
  db: DbClient,
  query: DiscoverQuery = {},
): Promise<DiscoverReelRow[]> {
  const limit = Math.min(Math.max(query.limit ?? 24, 1), 48);
  const q = query.q?.trim();
  const handle = query.handle?.trim().replace(/^@/, "");
  const platform = query.platform ?? "all";
  const sort = query.sort ?? "trending";

  const filters = [
    isNotNull(sourceReels.mp4R2Key),
    inArray(sourceReels.status, ["asset_ready", "preview_ready", "selected"]),
  ];

  if (handle) {
    filters.push(eq(sourceAccounts.handle, handle));
  }

  if (platform && platform !== "all") {
    filters.push(eq(sourceReels.platform, platform));
  }

  if (q) {
    for (const tokenFilter of tokenFilters(q)) {
      filters.push(tokenFilter);
    }
  }

  const orderBy =
    sort === "likes"
      ? [desc(sourceReels.likeCount), desc(sourceReels.ingestedAt)]
      : sort === "recent"
        ? [desc(sourceReels.ingestedAt)]
        : sort === "views"
          ? [desc(sourceReels.viewCount), desc(sourceReels.ingestedAt)]
          : [desc(trendingScoreExpr), desc(sourceReels.viewCount)];

  const rows = await db
    .select({
      shortcode: sourceReels.shortcode,
      reelUrl: sourceReels.reelUrl,
      caption: sourceReels.caption,
      viewCount: sourceReels.viewCount,
      likeCount: sourceReels.likeCount,
      commentCount: sourceReels.commentCount,
      durationSeconds: sourceReels.durationSeconds,
      handle: sourceAccounts.handle,
      platform: sourceReels.platform,
      thumbnailKey: sourceReels.firstFrameR2Key,
      rankPayload: sourceReels.rankPayload,
      mp4Key: sourceReels.mp4R2Key,
      postedAt: sourceReels.postedAt,
      trendingScore: trendingScoreExpr,
    })
    .from(sourceReels)
    .innerJoin(sourceAccounts, eq(sourceReels.sourceAccountId, sourceAccounts.id))
    .where(and(...filters))
    .orderBy(...orderBy)
    .limit(limit);

  return rows.map((row) => {
    const payload =
      row.rankPayload && typeof row.rankPayload === "object"
        ? (row.rankPayload as { firstFramePublicUrl?: string; mp4PublicUrl?: string })
        : null;

    return {
      shortcode: row.shortcode,
      reelUrl: row.reelUrl,
      caption: row.caption,
      viewCount: row.viewCount,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      durationSeconds: row.durationSeconds,
      handle: row.handle,
      platform: row.platform ?? "instagram",
      thumbnailKey: row.thumbnailKey,
      thumbnailPublicUrl: payload?.firstFramePublicUrl ?? null,
      videoPublicUrl: payload?.mp4PublicUrl ?? null,
      mp4Key: row.mp4Key,
      postedAt: row.postedAt?.toISOString() ?? null,
      trendingScore: Number(row.trendingScore ?? 0),
    };
  });
}

export async function listDiscoverHandles(db: DbClient, limit = 20): Promise<string[]> {
  const rows = await db
    .select({
      handle: sourceAccounts.handle,
      count: sql<number>`count(*)`,
    })
    .from(sourceReels)
    .innerJoin(sourceAccounts, eq(sourceReels.sourceAccountId, sourceAccounts.id))
    .where(
      and(
        isNotNull(sourceReels.mp4R2Key),
        inArray(sourceReels.status, ["asset_ready", "preview_ready", "selected"]),
      ),
    )
    .groupBy(sourceAccounts.handle)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows.map((row) => row.handle);
}
