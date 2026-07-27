import { NextResponse } from "next/server";
import { deleteSourceAccountRecord, updateSourceAccountRecord } from "@crosspost/pipeline";
import { updateSourceAccountSchema } from "@crosspost/shared";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSourceAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update", issues: parsed.error.issues }, { status: 400 });
    }

    const db = getDb();
    const account = await updateSourceAccountRecord(db, Number(id), parsed.data);
    return NextResponse.json({ account });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update source" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const { id } = await params;
    const accountId = Number(id);
    if (!Number.isFinite(accountId)) {
      return NextResponse.json({ error: "Invalid account id" }, { status: 400 });
    }

    const db = getDb();
    const result = await deleteSourceAccountRecord(db, accountId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete source account" },
      { status: 500 },
    );
  }
}
