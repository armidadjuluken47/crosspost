import { NextRequest, NextResponse } from "next/server";
import { listDiscoverableReels, listDiscoverHandles } from "@crosspost/pipeline";
import { resolveAssetUrl } from "@/lib/assets";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const env = getServerEnv();
    const params = new URL(request.url).searchParams;
    const q = params.get("q") ?? undefined;
    const handle = params.get("handle") ?? undefined;
    const platformParam = params.get("platform");
    const platform =
      platformParam === "instagram" ||
      platformParam === "tiktok" ||
      platformParam === "youtube" ||
      platformParam === "all"
        ? platformParam
        : "all";
    const sort = (params.get("sort") as "views" | "likes" | "recent" | "trending" | null) ?? "trending";

    const [reels, handles] = await Promise.all([
      listDiscoverableReels(db, { q, handle, platform, sort, limit: 48 }),
      listDiscoverHandles(db),
    ]);

    const totalViews = reels.reduce((sum, reel) => sum + (reel.viewCount ?? 0), 0);
    const topScore = reels.reduce((max, reel) => Math.max(max, reel.trendingScore), 0);

    return NextResponse.json({
      reels: reels.map((reel) => ({
        shortcode: reel.shortcode,
        reelUrl: reel.reelUrl,
        caption: reel.caption,
        viewCount: reel.viewCount,
        likeCount: reel.likeCount,
        commentCount: reel.commentCount,
        durationSeconds: reel.durationSeconds,
        trendingScore: reel.trendingScore,
        handle: reel.handle,
        platform: reel.platform,
        thumbnailUrl: resolveAssetUrl(env, reel.thumbnailKey, reel.thumbnailPublicUrl),
        videoUrl: resolveAssetUrl(env, reel.mp4Key, reel.videoPublicUrl),
        postedAt: reel.postedAt,
      })),
      handles,
      stats: {
        reelCount: reels.length,
        totalViews,
        avgViews: reels.length ? Math.round(totalViews / reels.length) : 0,
        topViralScore: Math.round(topScore),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load discover feed" },
      { status: 500 },
    );
  }
}
