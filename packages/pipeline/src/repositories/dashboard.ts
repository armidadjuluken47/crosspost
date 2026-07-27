import { and, desc, eq, inArray, notExists, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { deliveries, exceptions, runJobs, runs } from "@crosspost/db";
import { getLatestAuditEvent } from "./audit";
import { getBatchSummaryStats } from "./batches";
import { buildKpiMetrics } from "./kpi";
import { getQueueCounts } from "../queue/run-jobs";
import { openException } from "./runs";

const ACTIVE_RUN_STATUSES = [
  "queued",
  "started",
  "image_gen",
  "image_qc",
  "video_gen",
  "video_qc",
  "delivering",
] as const;

const ACTIVE_JOB_STATUSES = ["queued", "running", "retry_scheduled"] as const;

export async function countActiveRuns(db: DbClient) {
  const rows = await db
    .select({ id: runs.id })
    .from(runs)
    .where(inArray(runs.status, [...ACTIVE_RUN_STATUSES]));

  return rows.length;
}

/** Runs stuck in a pipeline state with no queued/running/retry job to process them. */
export async function listOrphanActiveRuns(db: DbClient) {
  return db
    .select({
      id: runs.id,
      status: runs.status,
      currentStage: runs.currentStage,
    })
    .from(runs)
    .where(
      and(
        inArray(runs.status, [...ACTIVE_RUN_STATUSES]),
        notExists(
          db
            .select({ id: runJobs.id })
            .from(runJobs)
            .where(
              and(
                eq(runJobs.runId, runs.id),
                inArray(runJobs.status, [...ACTIVE_JOB_STATUSES]),
              ),
            ),
        ),
      ),
    );
}

export async function closeOrphanActiveRuns(db: DbClient, requestedBy = "system") {
  const orphans = await listOrphanActiveRuns(db);
  const closedRunIds: number[] = [];

  for (const run of orphans) {
    await openException(db, {
      runId: run.id,
      stage: run.currentStage ?? run.status,
      reason: "Orphan run — no active queue job",
      payload: { closedBy: requestedBy, priorStatus: run.status },
    });
    closedRunIds.push(run.id);
  }

  return closedRunIds;
}

export async function getLastSuccessfulDriveDelivery(db: DbClient) {
  const [row] = await db
    .select({
      drivePath: deliveries.drivePath,
      destination: deliveries.destination,
      createdAt: deliveries.createdAt,
      runId: deliveries.runId,
    })
    .from(deliveries)
    .innerJoin(runs, eq(deliveries.runId, runs.id))
    .where(
      and(
        eq(runs.status, "delivered"),
        eq(deliveries.destination, "drive"),
        sql`${deliveries.drivePath} not like 'fixture-drive/%'`,
      ),
    )
    .orderBy(desc(deliveries.createdAt))
    .limit(1);

  return row ?? null;
}

export async function buildDashboardSummary(db: DbClient) {
  const [runStats] = await db
    .select({
      totalRuns: sql<number>`count(*)::int`,
      deliveredRuns: sql<number>`count(*) filter (where ${runs.status} = 'delivered')::int`,
      totalCostCents: sql<number>`coalesce(sum(${runs.costCents}), 0)::int`,
    })
    .from(runs);

  const [deliveryStats] = await db
    .select({
      totalDeliveries: sql<number>`count(*)::int`,
    })
    .from(deliveries);

  const openExceptions = await db
    .select({ id: exceptions.id })
    .from(exceptions)
    .where(eq(exceptions.status, "open"));

  const queueCounts = await getQueueCounts(db);
  const latestAuditEvent = await getLatestAuditEvent(db);
  const lastSuccessfulDelivery = await getLastSuccessfulDriveDelivery(db);
  const batchStats = await getBatchSummaryStats(db);
  const kpis = await buildKpiMetrics(db);
  const successRate =
    (runStats?.totalRuns ?? 0) > 0
      ? Math.round(((runStats?.deliveredRuns ?? 0) / (runStats?.totalRuns ?? 1)) * 100)
      : 0;

  return {
    totalRuns: runStats?.totalRuns ?? 0,
    deliveredRuns: runStats?.deliveredRuns ?? 0,
    successRate,
    openExceptions: openExceptions.length,
    queueCounts,
    totalDeliveries: deliveryStats?.totalDeliveries ?? 0,
    totalCostCents: runStats?.totalCostCents ?? 0,
    batchStats,
    kpis,
    latestAuditEvent,
    lastSuccessfulDelivery,
  };
}
