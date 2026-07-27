import { NextResponse } from "next/server";
import { deactivateModelReference } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; refId: string }> },
) {
  try {
    const { id, refId } = await params;
    const db = getDb();
    const reference = await deactivateModelReference(db, Number(id), Number(refId));
    return NextResponse.json({ reference });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deactivate reference" },
      { status: 500 },
    );
  }
}
