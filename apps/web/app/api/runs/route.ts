import { NextResponse } from "next/server";
import { enqueueManualRun, executeManualRun, listRunsEnriched } from "@crosspost/pipeline";
import { manualRunRequestSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit-guard";
import { serializeRunListItem } from "@/lib/run-serializer";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);
    const db = getDb();
    const rows = await listRunsEnriched(db, Number.isFinite(limit) ? limit : 50);
    return NextResponse.json({ runs: rows.map(serializeRunListItem) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list runs" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "runs:create", 10, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const parsed = manualRunRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid run payload",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const env = getServerEnv();
    const db = getDb();
    const executionMode = parsed.data.executionMode ?? env.RUN_EXECUTION_MODE;

    if (executionMode === "queued") {
      const queued = await enqueueManualRun(db, parsed.data);

      return NextResponse.json(
        {
          run: { id: queued.run.id, status: queued.run.status },
          job: {
            id: queued.job.id,
            status: queued.job.status,
            source: queued.job.source,
          },
        },
        { status: 202 },
      );
    }

    const result = await executeManualRun(env, db, parsed.data);

    return NextResponse.json(
      {
        run: { id: result.runId, status: result.status },
        providerId: result.providerId,
        videoProviderId: result.videoProviderId,
        winnerCandidateId: result.winnerCandidateId,
        image: result.image,
        video: result.video,
        delivery: result.delivery,
      },
      { status: result.status === "delivered" ? 201 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create run" },
      { status: 500 },
    );
  }
}
