import { NextResponse } from "next/server";
import { getBatchDetail } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();
    const detail = await getBatchDetail(db, Number(id));
    if (!detail) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load batch" },
      { status: 500 },
    );
  }
}
