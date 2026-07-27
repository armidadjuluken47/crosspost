import { NextRequest, NextResponse } from "next/server";
import { acceptWorkspaceInvite } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { creatorUserCookieHeader, resolveCreatorUserId } from "@/lib/creator-auth";
import { workspaceCookieHeader } from "@/lib/creator-workspace";
import { authenticateFirebase } from "@/lib/firebase-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const userId = await resolveCreatorUserId(request);
    const db = getDb();

    let email: string | null = null;
    const auth = await authenticateFirebase(request);
    if ("user" in auth && auth.user?.email) {
      email = String(auth.user.email);
    } else {
      try {
        const body = (await request.json()) as { email?: string };
        email = body.email?.trim() || null;
      } catch {
        email = null;
      }
    }

    const result = await acceptWorkspaceInvite(db, {
      token,
      userId,
      email,
    });

    const response = NextResponse.json({
      ok: true,
      workspacePublicId: result.workspacePublicId,
      workspaceName: result.workspaceName,
      alreadyMember: result.alreadyMember,
    });

    response.headers.append("Set-Cookie", workspaceCookieHeader(result.workspacePublicId));
    if (!request.cookies.get("crosspost_uid")) {
      response.headers.append("Set-Cookie", creatorUserCookieHeader(userId));
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept invite" },
      { status: 400 },
    );
  }
}
