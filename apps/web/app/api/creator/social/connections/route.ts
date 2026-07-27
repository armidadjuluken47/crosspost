import { NextRequest, NextResponse } from "next/server";
import { listSocialConnections } from "@crosspost/pipeline";
import {
  hasInstagramOAuth,
  hasTikTokOAuth,
  hasYouTubeOAuth,
} from "@crosspost/shared";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { creatorUserCookieHeader, resolveCreatorUserId } from "@/lib/creator-auth";

export async function GET(request: NextRequest) {
  try {
    const env = getServerEnv();
    const db = getDb();
    const userId = await resolveCreatorUserId(request);
    const connections = await listSocialConnections(db, userId);

    const response = NextResponse.json({
      connections,
      available: {
        youtube: hasYouTubeOAuth(env),
        tiktok: hasTikTokOAuth(env),
        instagram: hasInstagramOAuth(env),
      },
    });

    if (!request.cookies.get("crosspost_uid")) {
      response.headers.set("Set-Cookie", creatorUserCookieHeader(userId));
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list connections" },
      { status: 500 },
    );
  }
}
