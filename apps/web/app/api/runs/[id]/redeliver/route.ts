import { NextResponse } from "next/server";
import { redeliverRun } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const runId = Number(id);
    if (!Number.isFinite(runId)) {
      return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
    }

    const env = getServerEnv();
    const db = getDb();
    const delivery = await redeliverRun(env, db, runId, "dashboard");

    return NextResponse.json({ delivery });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Re-delivery failed" },
      { status: 500 },
    );
  }
}
