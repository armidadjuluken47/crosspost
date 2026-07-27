import { NextResponse } from "next/server";
import { deleteModelRecord, getModelWithReferences, updateModelRecord } from "@crosspost/pipeline";
import { updateModelSchema } from "@crosspost/shared";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();
    const model = await getModelWithReferences(db, Number(id));
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
    return NextResponse.json({ model });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get model" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateModelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update", issues: parsed.error.issues }, { status: 400 });
    }

    const db = getDb();
    const model = await updateModelRecord(db, Number(id), parsed.data);
    return NextResponse.json({ model });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update model" },
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
    const modelId = Number(id);
    if (!Number.isFinite(modelId)) {
      return NextResponse.json({ error: "Invalid model id" }, { status: 400 });
    }

    const db = getDb();
    const result = await deleteModelRecord(db, modelId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete model" },
      { status: 500 },
    );
  }
}
