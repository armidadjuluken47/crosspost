import { count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { creatorBatches, creatorProjects, runs } from "@crosspost/db";

export type CreatorProductMetrics = {
  totalProjects: number;
  readyProjects: number;
  processingProjects: number;
  failedProjects: number;
  projectsToday: number;
  activeUsers7d: number;
  totalBatches: number;
  recordedCostCents: number;
};

export type CreatorUsageRow = {
  externalUserId: string;
  projectCount: number;
  readyCount: number;
  failedCount: number;
  lastProjectAt: string | null;
};

export async function buildCreatorProductMetrics(db: DbClient): Promise<CreatorProductMetrics> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalRow,
    readyRow,
    processingRow,
    failedRow,
    todayRow,
    activeUsersRow,
    batchRow,
    costRow,
  ] = await Promise.all([
    db.select({ value: count() }).from(creatorProjects),
    db
      .select({ value: count() })
      .from(creatorProjects)
      .where(eq(creatorProjects.status, "ready")),
    db
      .select({ value: count() })
      .from(creatorProjects)
      .where(eq(creatorProjects.status, "processing")),
    db
      .select({ value: count() })
      .from(creatorProjects)
      .where(eq(creatorProjects.status, "failed")),
    db
      .select({ value: count() })
      .from(creatorProjects)
      .where(gte(creatorProjects.createdAt, startOfDay)),
    db
      .select({
        value: sql<number>`count(distinct ${creatorProjects.externalUserId})`,
      })
      .from(creatorProjects)
      .where(gte(creatorProjects.createdAt, sevenDaysAgo)),
    db.select({ value: count() }).from(creatorBatches),
    db
      .select({
        value: sql<number>`coalesce(sum(${runs.costCents}), 0)`,
      })
      .from(creatorProjects)
      .innerJoin(runs, eq(creatorProjects.runId, runs.id)),
  ]);

  const [total] = totalRow;
  const [ready] = readyRow;
  const [processing] = processingRow;
  const [failed] = failedRow;
  const [today] = todayRow;
  const [activeUsers] = activeUsersRow;
  const [batches] = batchRow;
  const [cost] = costRow;

  return {
    totalProjects: Number(total?.value ?? 0),
    readyProjects: Number(ready?.value ?? 0),
    processingProjects: Number(processing?.value ?? 0),
    failedProjects: Number(failed?.value ?? 0),
    projectsToday: Number(today?.value ?? 0),
    activeUsers7d: Number(activeUsers?.value ?? 0),
    totalBatches: Number(batches?.value ?? 0),
    recordedCostCents: Number(cost?.value ?? 0),
  };
}

export async function listCreatorUsageByUser(
  db: DbClient,
  limit = 50,
): Promise<CreatorUsageRow[]> {
  const rows = await db
    .select({
      externalUserId: creatorProjects.externalUserId,
      projectCount: count(),
      readyCount: sql<number>`count(*) filter (where ${creatorProjects.status} = 'ready')`,
      failedCount: sql<number>`count(*) filter (where ${creatorProjects.status} = 'failed')`,
      lastProjectAt: sql<string>`max(${creatorProjects.createdAt})`,
    })
    .from(creatorProjects)
    .groupBy(creatorProjects.externalUserId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows.map((row) => ({
    externalUserId: row.externalUserId,
    projectCount: Number(row.projectCount),
    readyCount: Number(row.readyCount),
    failedCount: Number(row.failedCount),
    lastProjectAt: row.lastProjectAt,
  }));
}

export async function countCreatorProjectsByStatusForUsers(
  db: DbClient,
  userIds: string[],
): Promise<Record<string, { total: number; ready: number; failed: number }>> {
  if (userIds.length === 0) return {};

  const rows = await db
    .select({
      externalUserId: creatorProjects.externalUserId,
      total: count(),
      ready: sql<number>`count(*) filter (where ${creatorProjects.status} = 'ready')`,
      failed: sql<number>`count(*) filter (where ${creatorProjects.status} = 'failed')`,
    })
    .from(creatorProjects)
    .where(inArray(creatorProjects.externalUserId, userIds))
    .groupBy(creatorProjects.externalUserId);

  return Object.fromEntries(
    rows.map((row) => [
      row.externalUserId,
      {
        total: Number(row.total),
        ready: Number(row.ready),
        failed: Number(row.failed),
      },
    ]),
  );
}
