import { NextResponse } from "next/server";
import { deleteRunRecord, getRunDetail } from "@crosspost/pipeline";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { serializeRunDetail } from "@/lib/run-serializer";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const runId = Number(id);

    if (!Number.isFinite(runId)) {
      return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
    }

    const db = getDb();
    const detail = await getRunDetail(db, runId);

    if (!detail) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(serializeRunDetail(detail));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load run" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const { id } = await context.params;
    const runId = Number(id);
    if (!Number.isFinite(runId)) {
      return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
    }

    const db = getDb();
    const result = await deleteRunRecord(db, runId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete run" },
      { status: 500 },
    );
  }
}
