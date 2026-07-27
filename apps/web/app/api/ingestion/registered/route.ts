import { NextResponse } from "next/server";
import { runRegisteredIntake } from "@crosspost/pipeline";
import { registeredIntakeSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit-guard";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, "intake:registered", 20, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const parsed = registeredIntakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid intake payload", issues: parsed.error.issues }, { status: 400 });
    }

    const env = getServerEnv();
    const db = getDb();
    const outcome = await runRegisteredIntake(env, db, parsed.data);

    return NextResponse.json(outcome, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registered intake failed" },
      { status: 500 },
    );
  }
}
