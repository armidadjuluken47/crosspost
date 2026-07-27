import { desc, eq } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import {
  auditLog,
  deliveries,
  exceptions,
  faceReferences,
  imageCandidates,
  models,
  runs,
  sourceReels,
  stageRuns,
  videoRenders,
} from "@crosspost/db";

export async function getRunDetail(db: DbClient, runId: number) {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  if (!run) return null;

  const [model] = run.modelId
    ? await db.select().from(models).where(eq(models.id, run.modelId)).limit(1)
    : [null];
  const [sourceReel] = run.sourceReelId
    ? await db.select().from(sourceReels).where(eq(sourceReels.id, run.sourceReelId)).limit(1)
    : [null];

  const references = run.modelId
    ? await db.select().from(faceReferences).where(eq(faceReferences.modelId, run.modelId))
    : [];

  const stages = await db
    .select()
    .from(stageRuns)
    .where(eq(stageRuns.runId, runId))
    .orderBy(stageRuns.id);

  const candidates = await db
    .select()
    .from(imageCandidates)
    .where(eq(imageCandidates.runId, runId))
    .orderBy(imageCandidates.id);

  const renders = await db
    .select()
    .from(videoRenders)
    .where(eq(videoRenders.runId, runId))
    .orderBy(videoRenders.id);

  const runDeliveries = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.runId, runId))
    .orderBy(deliveries.id);

  const runExceptions = await db
    .select()
    .from(exceptions)
    .where(eq(exceptions.runId, runId))
    .orderBy(desc(exceptions.id));

  const auditEvents = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.entityType, "run"))
    .orderBy(desc(auditLog.id))
    .limit(50);

  const filteredAudit = auditEvents.filter((event) => event.entityId === String(runId));

  const winnerCandidate = candidates.find((candidate) => candidate.isWinner) ?? null;
  const winnerRender = renders.find((render) => render.isWinner) ?? null;

  return {
    run,
    model,
    sourceReel,
    references,
    stages,
    candidates,
    renders,
    deliveries: runDeliveries,
    exceptions: runExceptions,
    auditEvents: filteredAudit,
    winnerCandidateId: winnerCandidate?.id ?? null,
    winnerRenderId: winnerRender?.id ?? null,
    providerId: stages.find((stage) => stage.stage === "image_gen" && stage.status === "success")
      ?.provider ?? null,
    videoProviderId: stages.find((stage) => stage.stage === "video_gen" && stage.status === "success")
      ?.provider ?? null,
    image: winnerCandidate
      ? { r2Key: winnerCandidate.normalizedR2Key ?? winnerCandidate.r2Key }
      : null,
    video: winnerRender ? { r2Key: winnerRender.r2Key } : null,
    delivery: runDeliveries[0] ?? null,
  };
}
