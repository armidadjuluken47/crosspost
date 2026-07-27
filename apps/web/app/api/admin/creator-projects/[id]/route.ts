import { NextRequest, NextResponse } from "next/server";
import { adminDeleteCreatorProject } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const result = await adminDeleteCreatorProject(db, id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    const status = message === "Project not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
