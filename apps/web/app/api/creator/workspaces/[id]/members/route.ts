import { NextRequest, NextResponse } from "next/server";
import { addWorkspaceMember } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { resolveCreatorUserId } from "@/lib/creator-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await resolveCreatorUserId(request);
    const body = (await request.json()) as { userId?: string; email?: string };
    const db = getDb();

    const members = await addWorkspaceMember(
      db,
      userId,
      id,
      body.userId ?? "",
      body.email ?? null,
    );

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
      { error: error instanceof Error ? error.message : "Failed to add member" },
      { status: 400 },
    );
  }
}
