import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceInviteByToken } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const db = getDb();
    const invite = await getWorkspaceInviteByToken(db, token);

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      workspace: invite.workspace,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invite not found" },
      { status: 404 },
    );
  }
}
