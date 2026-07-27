import { NextResponse } from "next/server";
import { buildDashboardSummary } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const summary = await buildDashboardSummary(db);
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build dashboard summary" },
      { status: 500 },
    );
  }
}
