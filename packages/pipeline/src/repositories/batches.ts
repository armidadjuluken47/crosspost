import { and, desc, eq, inArray, or, isNull, ne, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import {
  batchItems,
  batches,
  faceReferences,
  models,
  runJobs,
  runs,
  sourceAccounts,
  sourceReels,
} from "@crosspost/db";
import type { AppEnv, CreateBatchRequest, ManualRunRequest } from "@crosspost/shared";
import { estimateBatchCostCents } from "@crosspost/shared";
import { writeAuditEvent } from "../health/buildHealthReport";
import { enqueueManualRun, retryRunJob } from "../queue/run-jobs";
import { updateRun } from "./runs";
import { isSourceReelUsed, markSourceReelsAsUsed } from "./sources-registry";
import { assertWithinDailySpendCap } from "./spend-cap";

function defaultBatchName() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `Batch_${stamp}_${suffix}`;
}

async function assertGenerationReadyModels(db: DbClient, modelIds: number[]) {
  const rows = await db.select().from(models).where(inArray(models.id, modelIds));
  if (rows.length !== modelIds.length) {
    throw new Error("One or more selected models were not found");
  }

  for (const model of rows) {
    const refs = await db
      .select()
      .from(faceReferences)
      .where(and(eq(faceReferences.modelId, model.id), eq(faceReferences.active, true)));
    if (refs.length < 3) {
      throw new Error(`Model @${model.slug} needs at least 3 active reference images`);
    }
  }

  return rows;
}

async function assertSelectableReels(db: DbClient, reelIds: number[]) {
  const rows = await db
    .select({
      reel: sourceReels,
      accountHandle: sourceAccounts.handle,
    })
    .from(sourceReels)
    .innerJoin(sourceAccounts, eq(sourceReels.sourceAccountId, sourceAccounts.id))
    .where(inArray(sourceReels.id, reelIds));

  if (rows.length !== reelIds.length) {
    throw new Error("One or more selected reels were not found");
  }

  for (const row of rows) {
    if (isSourceReelUsed(row.reel)) {
      throw new Error(
        `Reel ${row.reel.shortcode} was already used in a previous batch run`,
      );
    }
    if (!["preview_ready", "selected"].includes(row.reel.status)) {
      throw new Error(`Reel ${row.reel.shortcode} is not ready for batch dispatch`);
    }
    if (!row.reel.mp4R2Key || !row.reel.firstFrameR2Key) {
      throw new Error(`Reel ${row.reel.shortcode} is missing source assets`);
    }
  }

  return rows;
}

function buildManualRunRequest(
  model: typeof models.$inferSelect,
  reelRow: {
    reel: typeof sourceReels.$inferSelect;
    accountHandle: string;
  },
  operatorInstruction?: string,
): ManualRunRequest {
  return {
    model: { slug: model.slug, displayName: model.displayName },
    sourceAccount: { handle: reelRow.accountHandle },
    sourceReel: {
      shortcode: reelRow.reel.shortcode,
      reelUrl: reelRow.reel.reelUrl,
      caption: reelRow.reel.caption ?? undefined,
      viewCount: reelRow.reel.viewCount ?? undefined,
      durationSeconds: reelRow.reel.durationSeconds ?? undefined,
      mp4R2Key: reelRow.reel.mp4R2Key ?? undefined,
      firstFrameR2Key: reelRow.reel.firstFrameR2Key ?? undefined,
      postedAt: reelRow.reel.postedAt?.toISOString(),
    },
    prompt: operatorInstruction,
    executionMode: "queued",
  };
}

export async function createAndQueueBatch(
  env: AppEnv,
  db: DbClient,
  input: CreateBatchRequest,
) {
  const modelRows = await assertGenerationReadyModels(db, input.modelIds);
  const reelRows = await assertSelectableReels(db, input.sourceReelIds);
  const modelById = new Map(modelRows.map((model) => [model.id, model]));
  const reelById = new Map(reelRows.map((row) => [row.reel.id, row]));

  const runCount = input.modelIds.length * input.sourceReelIds.length;
  const costMode =
    env.IMAGE_PROVIDER_MODE === "api" || env.VIDEO_PROVIDER_MODE === "api" ? "live" : "fixture";
  const estimatedCostCents = estimateBatchCostCents(runCount, costMode);

  await assertWithinDailySpendCap(env, db, estimatedCostCents);

  const [batch] = await db
    .insert(batches)
    .values({
      name: input.name ?? defaultBatchName(),
      status: "queued",
      createdBy: input.requestedBy ?? "dashboard",
      operatorInstruction: input.operatorInstruction,
      settingsSnapshot: {
        modelIds: input.modelIds,
        sourceReelIds: input.sourceReelIds,
        estimatedCostCents,
        providerMode: costMode,
      },
      startedAt: new Date(),
    })
    .returning();

  const items = [];
  for (const modelId of input.modelIds) {
    for (const reelId of input.sourceReelIds) {
      const model = modelById.get(modelId)!;
      const reelRow = reelById.get(reelId)!;
      const request = buildManualRunRequest(model, reelRow, input.operatorInstruction);

      const [batchItem] = await db
        .insert(batchItems)
        .values({
          batchId: batch!.id,
          sourceReelId: reelId,
          modelId,
          status: "queued",
        })
        .returning();

      const { run, job } = await enqueueManualRun(db, request, {
        batchId: batch!.id,
        idempotencyKey: `batch:${batch!.id}:${modelId}:${reelId}`,
      });

      const [updatedItem] = await db
        .update(batchItems)
        .set({ runId: run.id, status: "queued" })
        .where(eq(batchItems.id, batchItem!.id))
        .returning();

      items.push({
        batchItem: updatedItem!,
        run,
        job,
        modelSlug: model.slug,
        reelShortcode: reelRow.reel.shortcode,
      });
    }
  }

  await db
    .update(batches)
    .set({ status: "running" })
    .where(eq(batches.id, batch!.id));

  await writeAuditEvent(db, {
    action: "batch.created",
    entityType: "batch",
    entityId: String(batch!.id),
    actorUserId: input.requestedBy ?? "dashboard",
    payload: {
      runCount,
      estimatedCostCents,
      modelCount: input.modelIds.length,
      reelCount: input.sourceReelIds.length,
    },
  });

  await markSourceReelsAsUsed(db, input.sourceReelIds);

  return {
    batch: { ...batch!, status: "running" as const },
    items,
    runCount,
    estimatedCostCents,
  };
}

export async function syncBatchStatus(db: DbClient, batchId: number) {
  const detail = await getBatchDetail(db, batchId);
  if (!detail) return null;

  const { batch: derived, statusCounts } = detail;

  const [current] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
  if (!current) return null;

  const shouldFinish =
    derived.status === "completed" || derived.status === "completed_with_exceptions";

  if (current.status === derived.status && (!shouldFinish || current.finishedAt)) {
    return derived;
  }

  const [updated] = await db
    .update(batches)
    .set({
      status: derived.status,
      finishedAt: shouldFinish ? (current.finishedAt ?? new Date()) : current.finishedAt,
    })
    .where(eq(batches.id, batchId))
    .returning();

  if (shouldFinish && statusCounts.delivered + statusCounts.failed === detail.runCount) {
    await writeAuditEvent(db, {
      action: "batch.completed",
      entityType: "batch",
      entityId: String(batchId),
      payload: { status: derived.status, statusCounts },
    });
  }

  return updated ?? derived;
}

export async function listBatches(db: DbClient, limit = 20) {
  const rows = await db.select().from(batches).orderBy(desc(batches.id)).limit(limit);
  const enriched = [];

  for (const batch of rows) {
    if (["completed", "completed_with_exceptions", "cancelled"].includes(batch.status)) {
      enriched.push(batch);
      continue;
    }

    const synced = await syncBatchStatus(db, batch.id);
    enriched.push(synced ?? batch);
  }

  return enriched;
}

export async function getBatchDetail(db: DbClient, batchId: number) {
  const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
  if (!batch) return null;

  const items = await db
    .select({
      item: batchItems,
      runStatus: runs.status,
      modelSlug: models.slug,
      modelDisplayName: models.displayName,
      reelShortcode: sourceReels.shortcode,
      accountHandle: sourceAccounts.handle,
    })
    .from(batchItems)
    .innerJoin(models, eq(batchItems.modelId, models.id))
    .innerJoin(sourceReels, eq(batchItems.sourceReelId, sourceReels.id))
    .innerJoin(sourceAccounts, eq(sourceReels.sourceAccountId, sourceAccounts.id))
    .leftJoin(runs, eq(batchItems.runId, runs.id))
    .where(eq(batchItems.batchId, batchId))
    .orderBy(batchItems.id);

  const statusCounts = {
    queued: 0,
    running: 0,
    delivered: 0,
    failed: 0,
    other: 0,
  };

  for (const row of items) {
    const status = row.runStatus ?? row.item.status;
    if (status === "delivered") statusCounts.delivered += 1;
    else if (status === "queued") statusCounts.queued += 1;
    else if (status === "exception" || status === "failed") statusCounts.failed += 1;
    else if (
      ["started", "image_gen", "image_qc", "video_gen", "video_qc", "delivering"].includes(status)
    ) {
      statusCounts.running += 1;
    } else {
      statusCounts.other += 1;
    }
  }

  const total = items.length;
  let derivedStatus = batch.status;
  if (total > 0 && statusCounts.delivered === total) {
    derivedStatus = "completed";
  } else if (statusCounts.failed > 0 && statusCounts.queued === 0 && statusCounts.running === 0) {
    derivedStatus = "completed_with_exceptions";
  }

  return {
    batch: { ...batch, status: derivedStatus as typeof batch.status },
    items: items.map((row) => ({
      ...row.item,
      runStatus: row.runStatus,
      modelSlug: row.modelSlug,
      modelDisplayName: row.modelDisplayName,
      reelShortcode: row.reelShortcode,
      accountHandle: row.accountHandle,
    })),
    statusCounts,
    runCount: total,
  };
}

export async function countActiveBatches(db: DbClient) {
  const rows = await db
    .select({ id: batches.id })
    .from(batches)
    .where(inArray(batches.status, ["queued", "running", "paused"]));
  return rows.length;
}

export async function getBatchSummaryStats(db: DbClient) {
  const [stats] = await db
    .select({
      totalBatches: sql<number>`count(*)::int`,
      activeBatches: sql<number>`count(*) filter (where ${batches.status} in ('queued', 'running', 'paused'))::int`,
      completedBatches: sql<number>`count(*) filter (where ${batches.status} in ('completed', 'completed_with_exceptions'))::int`,
    })
    .from(batches);

  return {
    totalBatches: stats?.totalBatches ?? 0,
    activeBatches: stats?.activeBatches ?? 0,
    completedBatches: stats?.completedBatches ?? 0,
  };
}

export async function pauseBatch(db: DbClient, batchId: number, requestedBy = "operator") {
  const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
  if (!batch) throw new Error(`Batch ${batchId} not found`);
  if (!["queued", "running"].includes(batch.status)) {
    throw new Error(`Batch ${batchId} cannot be paused from status ${batch.status}`);
  }

  const [updated] = await db
    .update(batches)
    .set({ status: "paused" })
    .where(eq(batches.id, batchId))
    .returning();

  await writeAuditEvent(db, {
    action: "batch.paused",
    entityType: "batch",
    entityId: String(batchId),
    actorUserId: requestedBy,
  });

  return updated!;
}

export async function resumeBatch(db: DbClient, batchId: number, requestedBy = "operator") {
  const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
  if (!batch) throw new Error(`Batch ${batchId} not found`);
  if (batch.status !== "paused") {
    throw new Error(`Batch ${batchId} is not paused`);
  }

  const [updated] = await db
    .update(batches)
    .set({ status: "running" })
    .where(eq(batches.id, batchId))
    .returning();

  await writeAuditEvent(db, {
    action: "batch.resumed",
    entityType: "batch",
    entityId: String(batchId),
    actorUserId: requestedBy,
  });

  return updated!;
}

export async function retryFailedBatchItems(
  db: DbClient,
  batchId: number,
  requestedBy = "operator",
) {
  const detail = await getBatchDetail(db, batchId);
  if (!detail) throw new Error(`Batch ${batchId} not found`);

  const retried: number[] = [];
  for (const item of detail.items) {
    const runStatus = item.runStatus ?? item.status;
    if (runStatus !== "exception" && runStatus !== "failed") continue;
    if (!item.runId) continue;

    const [job] = await db
      .select()
      .from(runJobs)
      .where(eq(runJobs.runId, item.runId))
      .orderBy(desc(runJobs.id))
      .limit(1);

    if (!job || (job.status !== "failed" && job.status !== "retry_scheduled")) {
      continue;
    }

    await updateRun(db, item.runId, {
      status: "queued",
      currentStage: "queued",
      exceptionId: null,
    });
    await retryRunJob(db, job.id, requestedBy);
    retried.push(item.id);
  }

  if (retried.length === 0) {
    throw new Error("No failed batch items with retryable jobs found");
  }

  await writeAuditEvent(db, {
    action: "batch.retry_failed",
    entityType: "batch",
    entityId: String(batchId),
    actorUserId: requestedBy,
    payload: { itemIds: retried },
  });

  return { batchId, retriedItemIds: retried };
}
