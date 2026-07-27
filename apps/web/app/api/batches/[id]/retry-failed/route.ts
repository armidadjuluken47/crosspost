import { NextResponse } from "next/server";
import { retryFailedBatchItems } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();
    const outcome = await retryFailedBatchItems(db, Number(id), "dashboard");
    return NextResponse.json(outcome);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry batch items" },
      { status: 500 },
    );
  }
}
