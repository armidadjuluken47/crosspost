import { NextResponse } from "next/server";
import { createPromptVersion, listPromptVersions } from "@crosspost/pipeline";
import { createPromptSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const prompts = await listPromptVersions(db);
    return NextResponse.json({ prompts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list prompts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createPromptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid prompt", issues: parsed.error.issues }, { status: 400 });
    }

    const db = getDb();
    const prompt = await createPromptVersion(db, parsed.data);
    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create prompt" },
      { status: 500 },
    );
  }
}
