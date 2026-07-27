import { NextRequest, NextResponse } from "next/server";
import { createWorkspaceInvite, listWorkspaceInvites } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { resolveCreatorUserId } from "@/lib/creator-auth";
import { getServerEnv } from "@/lib/env";
import { authenticateFirebase } from "@/lib/firebase-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await resolveCreatorUserId(request);
    const db = getDb();
    const invites = await listWorkspaceInvites(db, userId, id);

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
      { error: error instanceof Error ? error.message : "Failed to list invites" },
      { status: 400 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await resolveCreatorUserId(request);
    const body = (await request.json()) as { email?: string; role?: "member" | "admin" };
    const db = getDb();
    const env = getServerEnv();

    const auth = await authenticateFirebase(request);
    const inviterLabel =
      "user" in auth && auth.user
        ? (auth.user.name as string | undefined) ||
          (auth.user.email as string | undefined) ||
          null
        : null;

    const result = await createWorkspaceInvite(db, env, {
      actorUserId: userId,
      workspacePublicId: id,
      email: body.email ?? "",
      role: body.role,
      inviterLabel,
    });

    return NextResponse.json({
      invite: {
        id: result.invite.id,
        email: result.invite.email,
        role: result.invite.role,
        status: result.invite.status,
        expiresAt: result.invite.expiresAt,
        createdAt: result.invite.createdAt,
        inviteUrl: result.invite.inviteUrl,
      },
      emailSent: result.email.sent,
      emailSkipped: result.email.skipped ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invite" },
      { status: 400 },
    );
  }
}
