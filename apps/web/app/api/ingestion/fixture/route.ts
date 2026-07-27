import { NextResponse } from "next/server";
import { runFixtureIntake } from "@crosspost/pipeline";
import { fixtureIntakeSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = fixtureIntakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid fixture intake payload", issues: parsed.error.issues }, { status: 400 });
    }

    const env = getServerEnv();
    const db = getDb();
    const outcome = await runFixtureIntake(env, db, {
      handle: parsed.data.sourceAccount.handle,
      maxReels: parsed.data.maxReels,
      requestedBy: parsed.data.requestedBy,
    });

    return NextResponse.json(outcome, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fixture intake failed" },
      { status: 500 },
    );
  }
}
