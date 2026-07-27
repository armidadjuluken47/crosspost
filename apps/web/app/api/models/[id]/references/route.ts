import { NextResponse } from "next/server";
import { addModelReference } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const env = getServerEnv();
    const db = getDb();

    const reference = await addModelReference(env, db, Number(id), {
      buffer,
      mimeType: file.type || "image/jpeg",
      filename: file.name,
    });

    return NextResponse.json({ reference }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload reference" },
      { status: 500 },
    );
  }
}
