import { NextResponse } from "next/server";
import { resumeBatch } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();
    const batch = await resumeBatch(db, Number(id), "dashboard");
    return NextResponse.json({ batch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resume batch" },
      { status: 500 },
    );
  }
}
