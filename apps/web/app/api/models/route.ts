import { NextResponse } from "next/server";
import { createModelRecord, listModelsWithReferences } from "@crosspost/pipeline";
import { createModelSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const models = await listModelsWithReferences(db);
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list models" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createModelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid model payload", issues: parsed.error.issues }, { status: 400 });
    }

    const db = getDb();
    const model = await createModelRecord(db, parsed.data);
    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create model" },
      { status: 500 },
    );
  }
}
