import { NextResponse } from "next/server";
import { executeDemoRun } from "@crosspost/pipeline";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit-guard";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "runs:demo", 5, 60_000);
    if (limited) return limited;

    const env = getServerEnv();
    const db = getDb();
    const result = await executeDemoRun(env, db);

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
      { status: result.status === "delivered" ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Demo run failed",
      },
      { status: 500 },
    );
  }
}
