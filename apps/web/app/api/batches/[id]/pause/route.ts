import { NextResponse } from "next/server";
import { pauseBatch } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();
    const batch = await pauseBatch(db, Number(id), "dashboard");
    return NextResponse.json({ batch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to pause batch" },
      { status: 500 },
    );
  }
}
