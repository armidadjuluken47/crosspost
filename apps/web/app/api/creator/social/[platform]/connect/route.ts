import { NextRequest, NextResponse } from "next/server";
import {
  getOAuthAdapter,
  isSocialPlatform,
  signOAuthState,
  socialRedirectUri,
} from "@crosspost/pipeline";
import { isSocialOAuthConfigured } from "@crosspost/shared";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { resolveCreatorWorkspace } from "@/lib/creator-workspace";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  try {
    const { platform } = await params;
    if (!isSocialPlatform(platform)) {
      return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
    }

    const env = getServerEnv();
    if (!isSocialOAuthConfigured(env, platform)) {
      return NextResponse.json(
        { error: `${platform} publishing is not configured on this server` },
        { status: 501 },
      );
    }

    const db = getDb();
    const { userId, workspaceId } = await resolveCreatorWorkspace(request, db);

    const state = signOAuthState(env, { uid: userId, workspaceId });
    const redirectUri = socialRedirectUri(env, platform);
    const url = getOAuthAdapter(platform).authorizeUrl(env, redirectUri, state);

    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start connection" },
      { status: 500 },
    );
  }
}
