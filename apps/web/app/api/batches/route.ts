import { NextResponse } from "next/server";
import { createAndQueueBatch, listBatches } from "@crosspost/pipeline";
import { createBatchSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit-guard";

export async function GET() {
  try {
    const db = getDb();
    const batches = await listBatches(db);
    return NextResponse.json({ batches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list batches" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "batch", 10, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const parsed = createBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid batch payload", issues: parsed.error.issues }, { status: 400 });
    }

    const env = getServerEnv();
    const db = getDb();
    const outcome = await createAndQueueBatch(env, db, parsed.data);

    return NextResponse.json(outcome, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create batch" },
      { status: 500 },
    );
  }
}
