import { NextRequest, NextResponse } from "next/server";
import {
  addWorkspaceMember,
  createTeamWorkspace,
  listUserWorkspaces,
  listWorkspaceMembers,
} from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { creatorUserCookieHeader, resolveCreatorUserId } from "@/lib/creator-auth";
import {
  readWorkspaceCookie,
  workspaceCookieHeader,
} from "@/lib/creator-workspace";

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveCreatorUserId(request);
    const db = getDb();
    const workspaces = await listUserWorkspaces(db, userId);
    const activePublicId = readWorkspaceCookie(request);

    const response = NextResponse.json({
      workspaces,
      activePublicId:
        activePublicId && workspaces.some((ws) => ws.publicId === activePublicId)
          ? activePublicId
          : workspaces.find((ws) => ws.isPersonal)?.publicId ?? workspaces[0]?.publicId ?? null,
    });

    if (!request.cookies.get("crosspost_uid")) {
      response.headers.set("Set-Cookie", creatorUserCookieHeader(userId));
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list workspaces" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveCreatorUserId(request);
    const body = (await request.json()) as { name?: string };
    const db = getDb();
    const workspace = await createTeamWorkspace(db, userId, body.name ?? "");

    const response = NextResponse.json({
      workspace: {
        publicId: workspace.publicId,
        name: workspace.name,
        isPersonal: workspace.isPersonal,
      },
    });
    response.headers.set("Set-Cookie", workspaceCookieHeader(workspace.publicId));
    response.headers.set("Set-Cookie", creatorUserCookieHeader(userId));
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create workspace" },
      { status: 400 },
    );
  }
}
