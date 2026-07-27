import { NextRequest, NextResponse } from "next/server";
import { deleteSocialConnection } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { resolveCreatorUserId } from "@/lib/creator-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();
    const userId = await resolveCreatorUserId(request);

    const removed = await deleteSocialConnection(db, userId, id);
    if (!removed) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect" },
      { status: 500 },
    );
  }
}
