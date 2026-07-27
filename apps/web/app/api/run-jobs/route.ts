import { NextResponse } from "next/server";
import { listRecentRunJobs } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const jobs = await listRecentRunJobs(db, 20);
    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list run jobs" },
      { status: 500 },
    );
  }
}
