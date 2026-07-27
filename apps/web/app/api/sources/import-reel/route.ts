import { NextResponse } from "next/server";
import { importReelByUrl } from "@crosspost/pipeline";
import { importReelSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit-guard";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "intake:import-reel", 15, 60_000);
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const parsed = importReelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid import payload", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const env = getServerEnv();
    const db = getDb();
    const outcome = await importReelByUrl(env, db, {
      url: parsed.data.url,
      requestedBy: parsed.data.requestedBy ?? "dashboard",
    });

    return NextResponse.json(outcome, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reel import failed" },
      { status: 500 },
    );
  }
}
