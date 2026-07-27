import { NextRequest, NextResponse } from "next/server";
import { revokeWorkspaceInvite } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { resolveCreatorUserId } from "@/lib/creator-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> },
) {
  try {
    const { id, inviteId } = await params;
    const inviteNumericId = Number(inviteId);
    if (!Number.isFinite(inviteNumericId)) {
      return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
    }

    const userId = await resolveCreatorUserId(request);
    const db = getDb();
    const invites = await revokeWorkspaceInvite(db, userId, id, inviteNumericId);

    return NextResponse.json({
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke invite" },
      { status: 400 },
    );
  }
}
