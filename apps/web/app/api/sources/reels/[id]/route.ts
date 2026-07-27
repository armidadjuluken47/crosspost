import { NextResponse } from "next/server";
import { updateSourceReelStatus } from "@crosspost/pipeline";
import { updateSourceReelSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSourceReelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update", issues: parsed.error.issues }, { status: 400 });
    }

    const db = getDb();
    const reel = await updateSourceReelStatus(db, Number(id), parsed.data.status);
    return NextResponse.json({ reel });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update reel" },
      { status: 500 },
    );
  }
}
