import { createHash } from "node:crypto";
import { and, desc, eq, inArray, lte, or, isNull, sql } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import { batches, runJobs, runs } from "@crosspost/db";
import type { AppEnv, ManualRunRequest } from "@crosspost/shared";
import { manualRunRequestSchema } from "@crosspost/shared";
import { writeAuditEvent } from "../health/buildHealthReport";
import { openException, updateRun, createRunRecord, writeRunAudit } from "../repositories/runs";
import { executeRunPipeline, prepareManualRun } from "../runs/execute-run";
import { syncBatchStatus } from "../repositories/batches";
import { markSourceReelsAsUsed } from "../repositories/sources-registry";
import { syncCreatorProjectFromRun } from "../creator/projects";

const LOCK_DURATION_MS = 90 * 60 * 1000;
const LOCK_HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000;

export async function renewRunJobLock(
  db: DbClient,
  jobId: number,
  workerId: string,
): Promise<void> {
  const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);

  await db
    .update(runJobs)
    .set({
      lockedUntil,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(runJobs.id, jobId),
        eq(runJobs.status, "running"),
        eq(runJobs.lockedBy, workerId),
      ),
    );
}

export function startRunJobLockHeartbeat(
  db: DbClient,
  jobId: number,
  workerId: string,
): () => void {
  const timer = setInterval(() => {
    void renewRunJobLock(db, jobId, workerId);
  }, LOCK_HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(timer);
}

export function buildManualRunIdempotencyKey(input: ManualRunRequest) {
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        model: input.model.slug,
        handle: input.sourceAccount.handle,
        shortcode: input.sourceReel.shortcode,
        prompt: input.prompt ?? "",
      }),
    )
    .digest("hex")
    .slice(0, 24);

  return `manual_run:${hash}`;
}

export async function enqueueManualRunJob(
  db: DbClient,
  input: {
    runId: number;
    request: ManualRunRequest;
    idempotencyKey?: string;
  },
) {
  const idempotencyKey = input.idempotencyKey ?? buildManualRunIdempotencyKey(input.request);

  const [existing] = await db
    .select()
    .from(runJobs)
    .where(eq(runJobs.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [job] = await db
    .insert(runJobs)
    .values({
      source: "manual_run",
      status: "queued",
      runId: input.runId,
      idempotencyKey,
      payload: {
        kind: "manual_run",
        request: input.request,
      },
    })
    .returning();

  return job!;
}

export async function enqueueManualRun(
  db: DbClient,
  input: ManualRunRequest,
  options?: { idempotencyKey?: string; batchId?: number },
) {
  const prepared = await prepareManualRun(db, input);
  const run = await createRunRecord(db, {
    modelId: prepared.model.id,
    sourceReelId: prepared.sourceReel.id,
    batchId: options?.batchId,
  });

  const job = await enqueueManualRunJob(db, {
    runId: run.id,
    request: input,
    idempotencyKey: options?.idempotencyKey,
  });

  await writeRunAudit(db, {
    action: "run.queued",
    entityType: "run",
    entityId: String(run.id),
    payload: { jobId: job.id, source: "manual_run", modelSlug: prepared.model.slug },
  });

  await writeAuditEvent(db, {
    action: "queue.job_enqueued",
    entityType: "run_job",
    entityId: String(job.id),
    payload: { runId: run.id, source: job.source },
  });

  await markSourceReelsAsUsed(db, [prepared.sourceReel.id]);

  return { run, job, prepared };
}

export async function listRecentRunJobs(db: DbClient, limit = 20) {
  return db.select().from(runJobs).orderBy(desc(runJobs.id)).limit(limit);
}

export async function getQueueCounts(db: DbClient) {
  const rows = await db
    .select({
      status: runJobs.status,
      count: runJobs.id,
    })
    .from(runJobs);

  const counts = {
    queued: 0,
    running: 0,
    succeeded: 0,
    retry_scheduled: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const row of rows) {
    if (row.status in counts) {
      counts[row.status as keyof typeof counts] += 1;
    }
  }

  return counts;
}

/** Jobs an operator should treat as in-flight (sidebar badge, queue attention). */
export async function getActionableQueueCount(db: DbClient) {
  const counts = await getQueueCounts(db);
  return counts.queued + counts.running + counts.retry_scheduled;
}

export async function countRunningRunJobs(db: DbClient) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(runJobs)
    .where(eq(runJobs.status, "running"));

  return row?.count ?? 0;
}

export async function releaseStaleRunJobs(db: DbClient) {
  const now = new Date();
  const stale = await db
    .select()
    .from(runJobs)
    .where(
      and(
        eq(runJobs.status, "running"),
        or(isNull(runJobs.lockedUntil), lte(runJobs.lockedUntil, now)),
      ),
    );

  for (const job of stale) {
    const staleReason = "Worker lock expired — job stalled";

    await db
      .update(runJobs)
      .set({
        status: "failed",
        error: staleReason,
        lockedBy: null,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(runJobs.id, job.id));

    if (job.runId) {
      const [run] = await db.select().from(runs).where(eq(runs.id, job.runId)).limit(1);
      if (run && run.status !== "delivered") {
        await updateRun(db, job.runId, { status: "exception", currentStage: run.currentStage });
        await openException(db, {
          runId: job.runId,
          stage: run.currentStage ?? "pipeline",
          reason: staleReason,
          payload: { jobId: job.id, lockedBy: job.lockedBy },
        });
      }
    }

    await writeAuditEvent(db, {
      action: "queue.job_stale_released",
      entityType: "run_job",
      entityId: String(job.id),
      payload: { runId: job.runId, lockedBy: job.lockedBy },
    });
  }

  return stale.length;
}

export async function claimNextRunJob(db: DbClient, workerId: string) {
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select()
      .from(runJobs)
      .where(
        and(
          inArray(runJobs.status, ["queued", "retry_scheduled"]),
          lte(runJobs.availableAt, new Date()),
        ),
      )
      .orderBy(runJobs.availableAt, runJobs.id)
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) {
      return null;
    }

    if (candidate.runId) {
      const [run] = await tx.select().from(runs).where(eq(runs.id, candidate.runId)).limit(1);
      if (run?.batchId) {
        const [batch] = await tx
          .select()
          .from(batches)
          .where(eq(batches.id, run.batchId))
          .limit(1);
        if (batch?.status === "paused") {
          return null;
        }
      }
    }

    const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    const [job] = await tx
      .update(runJobs)
      .set({
        status: "running",
        lockedBy: workerId,
        lockedUntil,
        attempts: candidate.attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(runJobs.id, candidate.id))
      .returning();

    return job ?? null;
  });
}

async function markJobSucceeded(db: DbClient, jobId: number, runId: number | null) {
  await db
    .update(runJobs)
    .set({
      status: "succeeded",
      lockedBy: null,
      lockedUntil: null,
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(runJobs.id, jobId));

  await writeAuditEvent(db, {
    action: "queue.job_succeeded",
    entityType: "run_job",
    entityId: String(jobId),
    payload: { runId },
  });
}

async function markJobFailed(
  db: DbClient,
  job: typeof runJobs.$inferSelect,
  errorMessage: string,
) {
  const shouldRetry = job.attempts < job.maxAttempts;
  const availableAt = new Date(Date.now() + Math.min(60_000 * job.attempts, 300_000));

  await db
    .update(runJobs)
    .set({
      status: shouldRetry ? "retry_scheduled" : "failed",
      lockedBy: null,
      lockedUntil: null,
      error: errorMessage,
      availableAt: shouldRetry ? availableAt : job.availableAt,
      updatedAt: new Date(),
    })
    .where(eq(runJobs.id, job.id));

  await writeAuditEvent(db, {
    action: shouldRetry ? "queue.job_retry_scheduled" : "queue.job_failed",
    entityType: "run_job",
    entityId: String(job.id),
    payload: {
      runId: job.runId,
      attempts: job.attempts,
      error: errorMessage,
    },
  });
}

export async function processRunJob(
  env: AppEnv,
  db: DbClient,
  job: typeof runJobs.$inferSelect,
  workerId: string,
) {
  if (!job.runId) {
    throw new Error(`Job ${job.id} is missing runId`);
  }

  if (job.source !== "manual_run") {
    throw new Error(`Unsupported job source: ${job.source}`);
  }

  const payload = job.payload as { kind?: string; request?: unknown };
  if (payload?.kind !== "manual_run" || !payload.request) {
    throw new Error(`Invalid manual_run payload for job ${job.id}`);
  }

  const request = manualRunRequestSchema.parse(payload.request);
  const prepared = await prepareManualRun(db, request);
  const stopLockHeartbeat = startRunJobLockHeartbeat(db, job.id, workerId);

  try {
    const result = await executeRunPipeline(env, db, job.runId, prepared);

    if (result.status === "delivered") {
      await markJobSucceeded(db, job.id, job.runId);
      await syncCreatorProjectFromRun(db, job.runId, env);
      const [run] = await db.select().from(runs).where(eq(runs.id, job.runId)).limit(1);
      if (run?.batchId) {
        await syncBatchStatus(db, run.batchId);
      }
    } else {
      await markJobFailed(db, job, `Run ended in status ${result.status}`);
      if (job.runId) {
        await syncCreatorProjectFromRun(db, job.runId, env);
      }
    }

    return result;
  } finally {
    stopLockHeartbeat();
  }
}

export async function processNextRunJob(env: AppEnv, db: DbClient, workerId: string) {
  await releaseStaleRunJobs(db);

  const runningJobs = await countRunningRunJobs(db);
  if (runningJobs >= env.WAVESPEED_MAX_CONCURRENT_JOBS) {
    return { processed: false as const, reason: "concurrency_cap" as const };
  }

  const job = await claimNextRunJob(db, workerId);
  if (!job) {
    return { processed: false as const };
  }

  try {
    const result = await processRunJob(env, db, job, workerId);
    return { processed: true as const, job, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job processing failed";
    await markJobFailed(db, job, message);
    throw error;
  }
}

export async function retryRunJob(db: DbClient, jobId: number, requestedBy = "system") {
  await releaseStaleRunJobs(db);

  const [job] = await db.select().from(runJobs).where(eq(runJobs.id, jobId)).limit(1);
  if (!job) {
    throw new Error(`Run job ${jobId} not found`);
  }

  const lockExpired = !job.lockedUntil || job.lockedUntil <= new Date();
  const canRetry =
    job.status === "failed" ||
    job.status === "retry_scheduled" ||
    job.status === "cancelled" ||
    (job.status === "running" && lockExpired);

  if (!canRetry) {
    throw new Error(`Run job ${jobId} cannot be retried from status ${job.status}`);
  }

  const [updated] = await db
    .update(runJobs)
    .set({
      status: "queued",
      availableAt: new Date(),
      lockedBy: null,
      lockedUntil: null,
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(runJobs.id, jobId))
    .returning();

  await writeAuditEvent(db, {
    action: "queue.job_requeued",
    entityType: "run_job",
    entityId: String(jobId),
    actorUserId: requestedBy,
    payload: { runId: job.runId },
  });

  return updated!;
}
