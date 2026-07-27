import { NextResponse } from "next/server";
import { runAccountIntake } from "@crosspost/pipeline";
import { accountIntakeSchema } from "@crosspost/shared";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit-guard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const limited = await enforceRateLimit(request, "intake:account", 10, 60_000);
    if (limited) return limited;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = accountIntakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid intake payload", issues: parsed.error.issues }, { status: 400 });
    }

    const env = getServerEnv();
    const db = getDb();
    const outcome = await runAccountIntake(env, db, {
      accountId: Number(id),
      maxReels: parsed.data.maxReels,
      requestedBy: parsed.data.requestedBy ?? "dashboard",
    });

    return NextResponse.json(outcome, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Account intake failed" },
      { status: 500 },
    );
  }
}
