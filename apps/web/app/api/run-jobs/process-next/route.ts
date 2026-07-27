import { NextResponse } from "next/server";
import { processNextRunJob } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export async function POST() {
  try {
    const env = getServerEnv();
    const db = getDb();
    const workerId = `web:${process.pid}`;

    const outcome = await processNextRunJob(env, db, workerId);

    if (!outcome.processed) {
      return NextResponse.json({ processed: false, message: "No queued jobs" }, { status: 200 });
    }

    return NextResponse.json(
      {
        processed: true,
        job: {
          id: outcome.job.id,
          status: outcome.job.status,
          runId: outcome.job.runId,
        },
        run: {
          id: outcome.result.runId,
          status: outcome.result.status,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process job" },
      { status: 500 },
    );
  }
}
