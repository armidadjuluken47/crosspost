import { NextResponse } from "next/server";
import {
  createSourceAccountRecord,
  listSourceAccountsWithCounts,
} from "@crosspost/pipeline";
import { createSourceAccountSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const accounts = await listSourceAccountsWithCounts(db);
    return NextResponse.json({ accounts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list sources" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSourceAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const db = getDb();
    const account = await createSourceAccountRecord(db, parsed.data);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create source" },
      { status: 500 },
    );
  }
}
