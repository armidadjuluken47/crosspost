import { and, desc, eq, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import {
  auditLog,
  batchItems,
  batches,
  creatorProjects,
  deliveries,
  exceptions,
  faceReferences,
  imageCandidates,
  models,
  prompts,
  runJobs,
  runs,
  sourceAccounts,
  sourceReels,
  stageRuns,
  videoRenders,
} from "@crosspost/db";

export async function getActivePrompt(db: DbClient, stage: "image_gen" | "video_gen") {
  const [prompt] = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.stage, stage), eq(prompts.active, true)))
    .orderBy(desc(prompts.version))
    .limit(1);

  return prompt ?? null;
}

export async function upsertModel(
  db: DbClient,
  input: { slug: string; displayName: string },
) {
  const [existing] = await db.select().from(models).where(eq(models.slug, input.slug)).limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(models)
    .values({
      slug: input.slug,
      displayName: input.displayName,
      status: "active",
    })
    .returning();

  return created!;
}

export async function upsertSourceAccount(db: DbClient, handle: string) {
  const normalized = handle.replace(/^@/, "").toLowerCase();
  const [existing] = await db
    .select()
    .from(sourceAccounts)
    .where(eq(sourceAccounts.handle, normalized))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(sourceAccounts)
    .values({ handle: normalized, status: "active" })
    .returning();

  return created!;
}

export async function upsertSourceReel(
  db: DbClient,
  input: {
    sourceAccountId: number;
    shortcode: string;
    reelUrl: string;
    caption?: string;
    viewCount?: number;
    durationSeconds?: number;
    mp4R2Key?: string;
    firstFrameR2Key?: string;
  },
) {
  const [existing] = await db
    .select()
    .from(sourceReels)
    .where(eq(sourceReels.shortcode, input.shortcode))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(sourceReels)
      .set({
        reelUrl: input.reelUrl,
        caption: input.caption,
        viewCount: input.viewCount,
        durationSeconds: input.durationSeconds,
        mp4R2Key: input.mp4R2Key ?? existing.mp4R2Key,
        firstFrameR2Key: input.firstFrameR2Key ?? existing.firstFrameR2Key,
        status: "preview_ready",
      })
      .where(eq(sourceReels.id, existing.id))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(sourceReels)
    .values({
      sourceAccountId: input.sourceAccountId,
      shortcode: input.shortcode,
      reelUrl: input.reelUrl,
      caption: input.caption,
      viewCount: input.viewCount,
      durationSeconds: input.durationSeconds,
      mp4R2Key: input.mp4R2Key,
      firstFrameR2Key: input.firstFrameR2Key,
      status: "preview_ready",
    })
    .returning();

  return created!;
}

export async function getModelReferences(db: DbClient, modelId: number) {
  return db
    .select()
    .from(faceReferences)
    .where(and(eq(faceReferences.modelId, modelId), eq(faceReferences.active, true)))
    .orderBy(faceReferences.ordinal);
}

export async function createRunRecord(
  db: DbClient,
  input: { modelId: number; sourceReelId: number; batchId?: number },
) {
  const [run] = await db
    .insert(runs)
    .values({
      modelId: input.modelId,
      sourceReelId: input.sourceReelId,
      batchId: input.batchId,
      status: "queued",
      currentStage: "queued",
      startedAt: new Date(),
    })
    .returning();

  return run!;
}

export async function updateRun(
  db: DbClient,
  runId: number,
  patch: Partial<typeof runs.$inferInsert>,
) {
  const [run] = await db.update(runs).set(patch).where(eq(runs.id, runId)).returning();
  return run!;
}

export async function createStageRunRecord(
  db: DbClient,
  input: {
    runId: number;
    stage: string;
    provider?: string;
    status: "pending" | "running" | "success" | "failed" | "retry" | "skipped";
    attempt?: number;
    costCents?: number;
    latencyMs?: number;
    requestPayload?: Record<string, unknown>;
    responsePayload?: Record<string, unknown>;
    promptStage?: "image_gen" | "video_gen";
    promptScope?: "global" | "model" | "source_account";
    promptVersion?: number;
    renderedPrompt?: string;
    outputR2Keys?: string[];
    error?: string;
  },
) {
  const [stageRun] = await db
    .insert(stageRuns)
    .values({
      runId: input.runId,
      stage: input.stage,
      provider: input.provider,
      status: input.status,
      attempt: input.attempt ?? 1,
      costCents: input.costCents ?? 0,
      latencyMs: input.latencyMs ?? 0,
      requestPayload: input.requestPayload,
      responsePayload: input.responsePayload,
      promptStage: input.promptStage,
      promptScope: input.promptScope,
      promptVersion: input.promptVersion,
      renderedPrompt: input.renderedPrompt,
      outputR2Keys: input.outputR2Keys,
      error: input.error,
      startedAt: new Date(),
      finishedAt: input.status === "success" || input.status === "failed" ? new Date() : undefined,
    })
    .returning();

  return stageRun!;
}

export async function createImageCandidateRecord(
  db: DbClient,
  input: {
    runId: number;
    ordinal?: number;
    provider: string;
    r2Key: string;
    normalizedR2Key: string;
    width: number;
    height: number;
    qcPayload: Record<string, unknown>;
    qcPassed: boolean;
    combinedScore: number;
    isWinner: boolean;
    costCents: number;
  },
) {
  const [candidate] = await db
    .insert(imageCandidates)
    .values({
      runId: input.runId,
      ordinal: input.ordinal ?? 1,
      provider: input.provider,
      r2Key: input.r2Key,
      normalizedR2Key: input.normalizedR2Key,
      width: input.width,
      height: input.height,
      qcPayload: input.qcPayload,
      qcPassed: input.qcPassed,
      combinedScore: input.combinedScore,
      isWinner: input.isWinner,
      costCents: input.costCents,
    })
    .returning();

  return candidate!;
}

export async function createVideoRenderRecord(
  db: DbClient,
  input: {
    runId: number;
    provider: string;
    r2Key: string;
    width: number;
    height: number;
    durationSeconds: number;
    qcPayload: Record<string, unknown>;
    qcPassed: boolean;
    isWinner: boolean;
    costCents: number;
  },
) {
  const [render] = await db
    .insert(videoRenders)
    .values({
      runId: input.runId,
      provider: input.provider,
      r2Key: input.r2Key,
      width: input.width,
      height: input.height,
      durationSeconds: input.durationSeconds,
      qcPayload: input.qcPayload,
      qcPassed: input.qcPassed,
      isWinner: input.isWinner,
      costCents: input.costCents,
    })
    .returning();

  return render!;
}

export async function createDeliveryRecord(
  db: DbClient,
  input: {
    runId: number;
    destination: string;
    r2Key: string;
    drivePath?: string;
    payload?: Record<string, unknown>;
  },
) {
  const [delivery] = await db
    .insert(deliveries)
    .values({
      runId: input.runId,
      destination: input.destination,
      r2Key: input.r2Key,
      drivePath: input.drivePath,
      status: "delivered",
      payload: input.payload,
    })
    .returning();

  return delivery!;
}

export async function openException(
  db: DbClient,
  input: {
    runId: number;
    stage: string;
    reason: string;
    payload?: Record<string, unknown>;
  },
) {
  const [exception] = await db
    .insert(exceptions)
    .values({
      runId: input.runId,
      stage: input.stage,
      reason: input.reason,
      payload: input.payload,
      status: "open",
    })
    .returning();

  await updateRun(db, input.runId, {
    status: "exception",
    currentStage: input.stage,
    exceptionId: exception!.id,
    finishedAt: new Date(),
  });

  return exception!;
}

export async function writeRunAudit(
  db: DbClient,
  input: {
    action: string;
    entityType: string;
    entityId: string;
    actorUserId?: string;
    payload?: Record<string, unknown>;
  },
) {
  await db.insert(auditLog).values({
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: input.actorUserId ?? "system",
    payload: input.payload,
  });
}

export async function listRecentRuns(db: DbClient, limit = 20) {
  return db.select().from(runs).orderBy(desc(runs.id)).limit(limit);
}

export type EnrichedRunRow = {
  id: number;
  status: string;
  currentStage: string | null;
  costCents: number;
  batchId: number | null;
  createdAt: Date;
  modelDisplayName: string | null;
  modelSlug: string | null;
  reelShortcode: string | null;
  reelCaption: string | null;
  firstFrameR2Key: string | null;
  batchName: string | null;
  errorHint: string | null;
};

export async function listRunsEnriched(db: DbClient, limit = 50): Promise<EnrichedRunRow[]> {
  return db
    .select({
      id: runs.id,
      status: runs.status,
      currentStage: runs.currentStage,
      costCents: runs.costCents,
      batchId: runs.batchId,
      createdAt: runs.createdAt,
      modelDisplayName: models.displayName,
      modelSlug: models.slug,
      reelShortcode: sourceReels.shortcode,
      reelCaption: sourceReels.caption,
      firstFrameR2Key: sourceReels.firstFrameR2Key,
      batchName: batches.name,
      errorHint: sql<string | null>`(
        SELECT COALESCE(
          (
            SELECT e.reason
            FROM "crosspost"."exceptions" e
            WHERE e.run_id = ${runs.id} AND e.status = 'open'
            ORDER BY e.id DESC
            LIMIT 1
          ),
          (
            SELECT sr.error
            FROM "crosspost"."stage_runs" sr
            WHERE sr.run_id = ${runs.id} AND sr.status = 'failed'
            ORDER BY sr.id DESC
            LIMIT 1
          )
        )
      )`,
    })
    .from(runs)
    .leftJoin(models, eq(runs.modelId, models.id))
    .leftJoin(sourceReels, eq(runs.sourceReelId, sourceReels.id))
    .leftJoin(batches, eq(runs.batchId, batches.id))
    .orderBy(desc(runs.id))
    .limit(limit);
}

export async function deleteRunRecord(db: DbClient, runId: number) {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }

  if (run.status !== "exception" && run.status !== "cancelled") {
    throw new Error(`Only exception or cancelled runs can be deleted (current: ${run.status})`);
  }

  const [linkedProject] = await db
    .select({ id: creatorProjects.id, publicId: creatorProjects.publicId })
    .from(creatorProjects)
    .where(eq(creatorProjects.runId, runId))
    .limit(1);

  if (linkedProject) {
    throw new Error(
      `Run ${runId} is linked to creator project ${linkedProject.publicId} and cannot be deleted`,
    );
  }

  await db.delete(exceptions).where(eq(exceptions.runId, runId));
  await db.delete(runJobs).where(eq(runJobs.runId, runId));
  await db
    .update(batchItems)
    .set({ runId: null, lastError: "run_deleted" })
    .where(eq(batchItems.runId, runId));
  await db.delete(runs).where(eq(runs.id, runId));

  await writeRunAudit(db, {
    action: "run.deleted",
    entityType: "run",
    entityId: String(runId),
    payload: { priorStatus: run.status },
  });

  return { runId };
}
