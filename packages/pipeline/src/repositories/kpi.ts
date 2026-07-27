import { eq, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { batches, imageCandidates, runs, stageRuns } from "@crosspost/db";

export async function buildKpiMetrics(db: DbClient) {
  const [latencyRow] = await db
    .select({
      avgLatencyMs: sql<number>`coalesce(avg(${stageRuns.latencyMs}), 0)::int`,
    })
    .from(stageRuns)
    .where(eq(stageRuns.status, "success"));

  const [costRow] = await db
    .select({
      deliveredRuns: sql<number>`count(*) filter (where ${runs.status} = 'delivered')::int`,
      totalCostCents: sql<number>`coalesce(sum(${runs.costCents}), 0)::int`,
    })
    .from(runs);

  const deliveredRuns = costRow?.deliveredRuns ?? 0;
  const totalCostCents = costRow?.totalCostCents ?? 0;

  const [imageStageRow] = await db
    .select({
      totalImageStages: sql<number>`count(*)::int`,
      runsWithFallback: sql<number>`count(distinct ${stageRuns.runId}) filter (where ${stageRuns.stage} = 'image_gen' and ${stageRuns.attempt} > 1)::int`,
      imageRuns: sql<number>`count(distinct ${stageRuns.runId}) filter (where ${stageRuns.stage} = 'image_gen')::int`,
    })
    .from(stageRuns)
    .where(eq(stageRuns.stage, "image_gen"));

  const [qcRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      passed: sql<number>`count(*) filter (where ${imageCandidates.qcPassed} = true)::int`,
    })
    .from(imageCandidates);

  const [batchCostRow] = await db
    .select({
      estimatedCents: sql<number>`coalesce(sum((${batches.settingsSnapshot}->>'estimatedCostCents')::int), 0)::int`,
      actualCents: sql<number>`coalesce(sum((${batches.settingsSnapshot}->>'actualCostCents')::int), 0)::int`,
    })
    .from(batches);

  const qcTotal = qcRow?.total ?? 0;
  const imageRuns = imageStageRow?.imageRuns ?? 0;

  return {
    avgProviderLatencyMs: latencyRow?.avgLatencyMs ?? 0,
    costPerDeliveredVideoCents:
      deliveredRuns > 0 ? Math.round(totalCostCents / deliveredRuns) : 0,
    imageProviderFallbackRate:
      imageRuns > 0
        ? Math.round(((imageStageRow?.runsWithFallback ?? 0) / imageRuns) * 100)
        : 0,
    qcPassRate: qcTotal > 0 ? Math.round(((qcRow?.passed ?? 0) / qcTotal) * 100) : 0,
    batchEstimatedCostCents: batchCostRow?.estimatedCents ?? 0,
    batchActualCostCents: batchCostRow?.actualCents ?? 0,
  };
}
