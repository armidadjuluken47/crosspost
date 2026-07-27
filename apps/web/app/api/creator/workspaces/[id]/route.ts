import { NextRequest, NextResponse } from "next/server";
import { deleteTeamWorkspace, listWorkspaceMembers } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { creatorUserCookieHeader, resolveCreatorUserId } from "@/lib/creator-auth";
import { workspaceCookieHeader } from "@/lib/creator-workspace";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await resolveCreatorUserId(request);
    const db = getDb();

    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", workspaceCookieHeader(id));
    if (!request.cookies.get("crosspost_uid")) {
      response.headers.set("Set-Cookie", creatorUserCookieHeader(userId));
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to switch workspace" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await resolveCreatorUserId(request);
    const db = getDb();

    const result = await deleteTeamWorkspace(db, userId, id);

    const response = NextResponse.json({ ok: true, activeWorkspace: result.movedToPublicId });
    // Switch the caller back to their personal workspace.
    response.headers.set("Set-Cookie", workspaceCookieHeader(result.movedToPublicId));
    if (!request.cookies.get("crosspost_uid")) {
      response.headers.append("Set-Cookie", creatorUserCookieHeader(userId));
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete workspace" },
      { status: 400 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await resolveCreatorUserId(request);
    const db = getDb();
    const members = await listWorkspaceMembers(db, id, userId);

    return NextResponse.json({
      members: members.map((member) => ({
        userId: member.userId,
        role: member.role,
        email: member.email,
        joinedAt: member.joinedAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load workspace" },
      { status: 404 },
    );
  }
}
