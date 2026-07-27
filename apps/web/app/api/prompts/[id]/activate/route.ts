import { NextResponse } from "next/server";
import { activatePromptVersion } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();
    const prompt = await activatePromptVersion(db, Number(id));
    return NextResponse.json({ prompt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to activate prompt" },
      { status: 500 },
    );
  }
}
