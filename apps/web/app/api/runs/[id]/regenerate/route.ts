import { NextResponse } from "next/server";
import { regenerateRun } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { enforceRateLimit } from "@/lib/rate-limit-guard";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const limited = await enforceRateLimit(_request, "runs:regenerate", 10, 60_000);
    if (limited) return limited;

    const { id } = await context.params;
    const runId = Number(id);
    if (!Number.isFinite(runId)) {
      return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
    }

    const db = getDb();
    const queued = await regenerateRun(db, runId, "dashboard");

    return NextResponse.json(
      {
        run: { id: queued.run.id, status: queued.run.status },
        job: { id: queued.job.id, status: queued.job.status },
        fromRunId: runId,
      },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate run" },
      { status: 500 },
    );
  }
}
