import { NextRequest, NextResponse } from "next/server";
import { importCreatorVideoFromUrl } from "@crosspost/pipeline";
import { getServerEnv } from "@/lib/env";
import { creatorUserCookieHeader, resolveCreatorUserId } from "@/lib/creator-auth";

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveCreatorUserId(request);
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const env = getServerEnv();
    const imported = await importCreatorVideoFromUrl(env, url);

    const response = NextResponse.json({ imported });
    if (!request.cookies.get("crosspost_uid")) {
      response.headers.set("Set-Cookie", creatorUserCookieHeader(userId));
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "URL import failed" },
      { status: 500 },
    );
  }
}
