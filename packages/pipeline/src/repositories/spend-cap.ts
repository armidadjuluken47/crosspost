import { gte, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { runs } from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";

export async function getTodaySpendCents(db: DbClient) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${runs.costCents}), 0)::int`,
    })
    .from(runs)
    .where(gte(runs.startedAt, startOfDay));

  return row?.total ?? 0;
}

export async function assertWithinDailySpendCap(
  env: AppEnv,
  db: DbClient,
  additionalCents: number,
) {
  const cap = env.DAILY_SPEND_CAP_CENTS;
  if (!cap || cap <= 0) return;

  const spent = await getTodaySpendCents(db);
  if (spent + additionalCents > cap) {
    throw new Error(
      `Daily spend cap exceeded: ${spent + additionalCents} cents requested vs ${cap} cents cap`,
    );
  }
}
