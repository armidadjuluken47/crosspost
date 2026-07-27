import { NextResponse } from "next/server";
import { listRecentAuditEvents } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const events = await listRecentAuditEvents(db, 50);
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list audit events" },
      { status: 500 },
    );
  }
}
