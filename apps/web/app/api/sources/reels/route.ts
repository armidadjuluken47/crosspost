import { NextResponse } from "next/server";
import { listSourceReels } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const status = searchParams.get("status") ?? undefined;

    const db = getDb();
    const reels = await listSourceReels(db, {
      accountId: accountId ? Number(accountId) : undefined,
      status,
    });

    return NextResponse.json({ reels });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list reels" },
      { status: 500 },
    );
  }
}
