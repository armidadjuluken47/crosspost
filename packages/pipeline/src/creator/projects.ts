import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import type { DbClient } from "@crosspost/db";
import {
  batchItems,
  creatorBatches,
  creatorProjects,
  creatorWorkspaceInvites,
  creatorWorkspaceMembers,
  creatorWorkspaces,
  deliveries,
  imageCandidates,
  exceptions,
  models,
  runJobs,
  runs,
  sourceAccounts,
  stageRuns,
  videoRenders,
} from "@crosspost/db";
import type { AppEnv } from "@crosspost/shared";
import {
  buildSourceFirstFrameKey,
  buildSourceMp4Key,
  normalizeSubtitleStyle,
  normalizeSwapTier,
} from "@crosspost/shared";
import {
  generateCaptions as generateCaptionPack,
  transcribeVideo,
} from "@crosspost/content-ai";
import { extractFirstFrameFromMp4 } from "../media/extract-first-frame";
import { prepareCreatorProjectExports } from "../export/prepare-exports";
import {
  maybeNotifyCreatorProjectReady,
  maybeNotifyCreatorProjectStatus,
} from "../notifications/notify-project-ready";
import {
  addModelReference,
  createModelRecord,
  deactivateModelReference,
  getModelWithReferences,
} from "../repositories/models";
import { enqueueManualRun } from "../queue/run-jobs";
import { executeManualRun as executeManualRunInline } from "../runs/execute-run";
import { getRunDetail } from "../repositories/run-detail";
import { createAssetStorage } from "../storage/index";
import { writeAuditEvent } from "../health/buildHealthReport";
import { isExpressSwapAvailable, runCreatorExpressSwap } from "./express-swap";
import {
  backfillLegacyProjectsToPersonalWorkspace,
  resolveActiveWorkspace,
  userCanAccessProject,
} from "./workspaces";

async function latestRunFailureMessage(db: DbClient, runId: number, fallbackStage?: string | null) {
  const [ex] = await db
    .select({ reason: exceptions.reason, stage: exceptions.stage })
    .from(exceptions)
    .where(eq(exceptions.runId, runId))
    .orderBy(desc(exceptions.id))
    .limit(1);

  if (ex?.reason?.trim()) {
    return ex.reason.trim().slice(0, 500);
  }

  return `Video generation failed (${fallbackStage ?? "pipeline"})`;
}

function slugifyUserId(userId: string) {
  return userId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "creator";
}

export function buildCreatorModelSlug(userId: string) {
  return `creator-${slugifyUserId(userId)}`;
}

export async function countCreatorProjects(db: DbClient, userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(creatorProjects)
    .where(eq(creatorProjects.externalUserId, userId));
  return Number(row?.value ?? 0);
}

export async function ensureCreatorModel(
  env: AppEnv,
  db: DbClient,
  userId: string,
  facePhoto: { buffer: Buffer; mimeType: string; filename: string },
) {
  const slug = buildCreatorModelSlug(userId);
  const [existing] = await db.select().from(models).where(eq(models.slug, slug)).limit(1);

  let model;
  if (existing) {
    model = await getModelWithReferences(db, existing.id);
  } else {
    const created = await createModelRecord(db, {
      slug,
      displayName: "My identity",
      notes: `Creator identity for ${userId}`,
    });
    model = await getModelWithReferences(db, created.id);
  }

  if (!model) {
    throw new Error("Failed to create creator model");
  }

  // Always refresh identity from this upload. Previously we kept the first 3 refs forever,
  // so later face photos were ignored (and an old wrong image kept getting used).
  const activeRefs = model.faceReferences.filter((ref) => ref.active);
  for (const ref of activeRefs) {
    await deactivateModelReference(db, model.id, ref.id);
  }

  for (let i = 0; i < 3; i += 1) {
    await addModelReference(env, db, model.id, facePhoto);
  }

  return getModelWithReferences(db, model.id);
}

export async function listCreatorProjects(
  db: DbClient,
  userId: string,
  workspacePublicId?: string | null,
) {
  const workspace = await resolveActiveWorkspace(db, userId, workspacePublicId);
  await backfillLegacyProjectsToPersonalWorkspace(db, userId);

  return db
    .select()
    .from(creatorProjects)
    .where(eq(creatorProjects.workspaceId, workspace.id))
    .orderBy(desc(creatorProjects.createdAt));
}

export async function getCreatorProject(
  db: DbClient,
  userId: string,
  publicId: string,
) {
  const [project] = await db
    .select()
    .from(creatorProjects)
    .where(eq(creatorProjects.publicId, publicId))
    .limit(1);

  if (!project) {
    return null;
  }

  const allowed = await userCanAccessProject(db, userId, project);
  if (!allowed) {
    return null;
  }

  return project;
}

export async function getCreatorProjectByPublicId(db: DbClient, publicId: string) {
  const [project] = await db
    .select()
    .from(creatorProjects)
    .where(eq(creatorProjects.publicId, publicId))
    .limit(1);
  return project ?? null;
}

export async function listAllCreatorProjects(
  db: DbClient,
  options: { status?: "draft" | "processing" | "ready" | "failed"; userId?: string; limit?: number } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const conditions = [];
  if (options.status) {
    conditions.push(eq(creatorProjects.status, options.status));
  }
  if (options.userId) {
    conditions.push(eq(creatorProjects.externalUserId, options.userId));
  }

  if (conditions.length === 0) {
    return db.select().from(creatorProjects).orderBy(desc(creatorProjects.createdAt)).limit(limit);
  }

  return db
    .select()
    .from(creatorProjects)
    .where(conditions.length === 1 ? conditions[0]! : and(...conditions))
    .orderBy(desc(creatorProjects.createdAt))
    .limit(limit);
}

export async function countCreatorProjectsByUserIds(db: DbClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, number>();

  const rows = await db
    .select({
      userId: creatorProjects.externalUserId,
      value: count(),
    })
    .from(creatorProjects)
    .where(inArray(creatorProjects.externalUserId, userIds))
    .groupBy(creatorProjects.externalUserId);

  return new Map(rows.map((row) => [row.userId, Number(row.value ?? 0)]));
}

export async function adminRetryCreatorProject(env: AppEnv, db: DbClient, publicId: string) {
  const project = await getCreatorProjectByPublicId(db, publicId);
  if (!project) {
    throw new Error("Project not found");
  }
  return retryCreatorProject(env, db, project.externalUserId, publicId);
}

export type ProjectProgressStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "failed";
};

export function buildProjectProgress(project: typeof creatorProjects.$inferSelect): ProjectProgressStep[] {
  const wantsCaptions = Boolean(project.wantsCaptions);
  const wantsHashtags = Boolean(project.wantsHashtags);
  const wantsSubtitles = Boolean(project.burnSubtitles);
  const needsTranscript = wantsCaptions || wantsHashtags || wantsSubtitles;

  const hasTranscript = Boolean(project.transcript);
  const hasCaptions = Boolean(project.caption);
  const runComplete = project.status === "ready";
  const runFailed = project.status === "failed";
  const processing = project.status === "processing";

  const steps: ProjectProgressStep[] = [
    {
      id: "import",
      label: "Video imported",
      status: "complete",
    },
  ];

  if (needsTranscript) {
    steps.push({
      id: "transcribe",
      label: "Transcript generated",
      status: hasTranscript
        ? "complete"
        : runComplete
          ? "complete"
          : processing
            ? "active"
            : "pending",
    });
  }

  steps.push({
    id: "video",
    label: "Creating your version",
    status: runFailed
      ? "failed"
      : runComplete
        ? "complete"
        : processing
          ? "active"
          : "pending",
  });

  if (wantsCaptions || wantsHashtags) {
    const label =
      wantsCaptions && wantsHashtags
        ? "Writing captions & hashtags"
        : wantsCaptions
          ? "Writing captions"
          : "Adding hashtags";
    steps.push({
      id: "captions",
      label,
      status: hasCaptions || runComplete
        ? "complete"
        : runFailed
          ? "failed"
          : hasTranscript
            ? "active"
            : "pending",
    });
  }

  if (wantsSubtitles) {
    steps.push({
      id: "subtitles",
      label: "Adding subtitles",
      status: runComplete ? "complete" : runFailed ? "failed" : "pending",
    });
  }

  steps.push({
    id: "export",
    label: "Preparing download",
    status: runComplete ? "complete" : runFailed ? "failed" : "pending",
  });

  return steps;
}

export async function syncCreatorProjectFromRun(db: DbClient, runId: number, env?: AppEnv) {
  const [project] = await db
    .select()
    .from(creatorProjects)
    .where(eq(creatorProjects.runId, runId))
    .limit(1);

  if (!project) return null;

  const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
  if (!run) return project;

  if (run.status === "delivered") {
    const [render] = await db
      .select()
      .from(videoRenders)
      .where(eq(videoRenders.runId, runId))
      .orderBy(desc(videoRenders.id))
      .limit(1);

    const [updated] = await db
      .update(creatorProjects)
      .set({
        status: "ready",
        outputVideoKey: render?.r2Key ?? project.outputVideoKey,
        updatedAt: new Date(),
      })
      .where(eq(creatorProjects.id, project.id))
      .returning();

    const ready = updated ?? project;
    if (env) {
      const withExports = (await prepareCreatorProjectExports(env, db, ready.id)) ?? ready;
      return (await maybeNotifyCreatorProjectReady(env, db, withExports.id)) ?? withExports;
    }
    return ready;
  }

  if (run.status === "exception" || run.status === "cancelled") {
    const errorMessage = await latestRunFailureMessage(db, runId, run.currentStage);
    const [updated] = await db
      .update(creatorProjects)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(creatorProjects.id, project.id))
      .returning();

    if (env) {
      await maybeNotifyCreatorProjectStatus(env, db, project.id);
    }
    return updated ?? project;
  }

  return project;
}

export async function createAndProcessCreatorProject(
  env: AppEnv,
  db: DbClient,
  input: {
    userId: string;
    title?: string;
    rightsAttested: boolean;
    generateCaptions?: boolean;
    generateHashtags?: boolean;
    burnSubtitles?: boolean;
    subtitleStyle?: string | null;
    swapTier?: string | null;
    workspaceId?: number | null;
    notifyEmail?: string | null;
    batchId?: number | null;
    facePhoto: { buffer: Buffer; mimeType: string; filename: string };
    video: { buffer: Buffer; mimeType: string; filename: string };
  },
  options?: { deferProcessing?: boolean },
) {
  if (!input.rightsAttested) {
    throw new Error("You must confirm video rights before processing");
  }

  if (!input.video.mimeType.startsWith("video/") && !input.video.filename.endsWith(".mp4")) {
    throw new Error("Only MP4/MOV video uploads are supported in Phase 1");
  }

  const model = await ensureCreatorModel(env, db, input.userId, input.facePhoto);
  const swapTier = normalizeSwapTier(input.swapTier);
  if (!model) {
    throw new Error("Failed to load creator model");
  }
  if (swapTier === "express" && !isExpressSwapAvailable(env)) {
    throw new Error("Express swap is not available — configure AKOOL_API_TOKEN");
  }
  if (swapTier !== "express" && (!model || model.activeReferenceCount < 3)) {
    throw new Error("Identity photos are required before processing");
  }

  const publicId = randomUUID().replace(/-/g, "").slice(0, 12);
  const handle = "creator-uploads";
  const shortcode = publicId;
  const mp4Key = buildSourceMp4Key(handle, shortcode);
  const firstFrameKey = buildSourceFirstFrameKey(handle, shortcode);
  const generateCaptions = Boolean(input.generateCaptions);
  const generateHashtags = Boolean(input.generateHashtags);
  const burnSubtitles = Boolean(input.burnSubtitles);
  const needsTranscript = generateCaptions || generateHashtags || burnSubtitles;
  const subtitleStyle = normalizeSubtitleStyle(input.subtitleStyle);
  const notifyEmail = input.notifyEmail?.trim() || null;
  const batchId = input.batchId ?? null;
  let workspaceId = input.workspaceId ?? null;
  if (!workspaceId) {
    const workspace = await resolveActiveWorkspace(db, input.userId, null);
    workspaceId = workspace.id;
  }

  const storage = createAssetStorage(env);
  await storage.putObject({
    key: mp4Key,
    body: input.video.buffer,
    mimeType: input.video.mimeType || "video/mp4",
  });

  const firstFrame = await extractFirstFrameFromMp4(env, input.video.buffer);
  await storage.putObject({
    key: firstFrameKey,
    body: firstFrame.buffer,
    mimeType: "image/png",
  });

  const [project] = await db
    .insert(creatorProjects)
    .values({
      publicId,
      externalUserId: input.userId,
      title: input.title?.trim() || "My remix",
      status: "processing",
      modelId: model.id,
      sourceVideoKey: mp4Key,
      rightsAttested: true,
      burnSubtitles,
      subtitleStyle,
      wantsCaptions: generateCaptions,
      wantsHashtags: generateHashtags,
      swapTier,
      workspaceId,
      notifyEmail,
      batchId,
    })
    .returning();

  if (!project) {
    throw new Error("Failed to create project");
  }

  const processProject = async () => {
    // Video/identity swap first — content AI must not block WaveSpeed testing.
    const manualRunRequest = {
      sourceAccount: { handle },
      sourceReel: {
        shortcode,
        reelUrl: `https://crosspost.local/projects/${publicId}`,
        mp4R2Key: mp4Key,
        firstFrameR2Key: firstFrameKey,
        durationSeconds: 30,
      },
      model: {
        slug: model.slug,
        displayName: model.displayName,
      },
      executionMode: env.RUN_EXECUTION_MODE,
    } as const;

    let runId: number | null = null;
    let videoReady = false;
    let outputVideoKey: string | null = null;
    let sourceReelId: number | null = null;
    let videoError: string | null = null;

    if (swapTier === "express") {
      try {
        const express = await runCreatorExpressSwap(env, storage, {
          publicId,
          facePhoto: input.facePhoto,
          sourceVideoKey: mp4Key,
        });
        outputVideoKey = express.outputVideoKey;
        videoReady = true;
      } catch (error) {
        videoError = error instanceof Error ? error.message : "Express swap failed";
      }
    } else if (env.RUN_EXECUTION_MODE === "queued") {
      const queued = await enqueueManualRun(db, manualRunRequest, {
        idempotencyKey: `creator_project:${publicId}`,
      });
      runId = queued.run.id;
      sourceReelId = queued.prepared.sourceReel.id;
    } else {
      const result = await executeManualRunInline(env, db, manualRunRequest);
      runId = result.runId;

      const [run] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1);
      sourceReelId = run?.sourceReelId ?? null;
      outputVideoKey = result.video?.r2Key ?? null;
      videoReady = result.status === "delivered";
      videoError = videoReady
        ? null
        : await latestRunFailureMessage(db, runId, run?.currentStage);
    }

    // Content AI (transcription + captions) must never fail the whole project —
    // a successful video swap should still deliver even if these external calls
    // error out (e.g. transient "fetch failed" or a missing content-AI key).
    let transcript: Awaited<ReturnType<typeof transcribeVideo>> | null = null;
    if (needsTranscript) {
      try {
        transcript = await transcribeVideo(env, input.video.buffer, input.video.filename);
      } catch (error) {
        console.warn(
          `[creator-project] Transcription failed for ${publicId} (continuing without it):`,
          error,
        );
      }
    }

    let caption: string | null = null;
    let hashtags: string | null = null;
    let hookVariants: string[] | null = null;
    let platformVariants: Awaited<
      ReturnType<typeof generateCaptionPack>
    >["platformVariants"] | null = null;

    if (generateCaptions || generateHashtags) {
      try {
        const captions = await generateCaptionPack(env, transcript?.text ?? "");
        if (generateCaptions) {
          caption = captions.caption;
          hookVariants = captions.hookVariants;
        }
        if (generateHashtags) {
          hashtags = captions.hashtags;
        }

        platformVariants = Object.fromEntries(
          Object.entries(captions.platformVariants).map(([platform, pack]) => [
            platform,
            {
              caption: generateCaptions ? pack.caption : "",
              hashtags: generateHashtags ? pack.hashtags : "",
              hookVariants: generateCaptions ? pack.hookVariants : [],
            },
          ]),
        ) as typeof captions.platformVariants;
      } catch (error) {
        console.warn(
          `[creator-project] Caption generation failed for ${publicId} (continuing without it):`,
          error,
        );
      }
    }

    const status =
      swapTier === "express"
        ? videoReady
          ? "ready"
          : "failed"
        : env.RUN_EXECUTION_MODE === "queued"
          ? "processing"
          : videoReady
            ? "ready"
            : "failed";

    await db
      .update(creatorProjects)
      .set({
        runId,
        sourceReelId,
        outputVideoKey,
        transcript,
        caption,
        hashtags,
        hookVariants,
        platformVariants,
        status,
        errorMessage: videoError,
        updatedAt: new Date(),
      })
      .where(eq(creatorProjects.id, project.id));

    if (status === "ready") {
      await prepareCreatorProjectExports(env, db, project.id);
      await maybeNotifyCreatorProjectReady(env, db, project.id);
    } else if (status === "failed") {
      await maybeNotifyCreatorProjectStatus(env, db, project.id);
    }
  };

  if (options?.deferProcessing) {
    void processProject().catch(async (error) => {
      const message = error instanceof Error ? error.message : "Processing failed";
      console.error(`[creator-project] Background processing failed for ${publicId}:`, error);
      await db
        .update(creatorProjects)
        .set({
          status: "failed",
          errorMessage: message,
          updatedAt: new Date(),
        })
        .where(eq(creatorProjects.id, project.id));
      await maybeNotifyCreatorProjectStatus(env, db, project.id);
    });
    return project;
  }

  await processProject();
  return (await getCreatorProject(db, input.userId, publicId)) ?? project;
}

/** Re-queue or re-run video generation for a failed creator project (no quota charge). */
export async function retryCreatorProject(
  env: AppEnv,
  db: DbClient,
  userId: string,
  publicId: string,
) {
  const project = await getCreatorProject(db, userId, publicId);
  if (!project) {
    throw new Error("Project not found");
  }
  if (project.status !== "failed") {
    throw new Error("Only failed projects can be retried");
  }
  if (!project.modelId || !project.sourceVideoKey) {
    throw new Error("Project is missing identity or source video for retry");
  }

  const model = await getModelWithReferences(db, project.modelId);
  if (!model) {
    throw new Error("Identity model not found");
  }

  let handle = "creator-uploads";
  let shortcode = project.publicId;
  let mp4Key = project.sourceVideoKey;
  let firstFrameKey = buildSourceFirstFrameKey(handle, shortcode);
  let durationSeconds = 30;

  if (project.runId) {
    const detail = await getRunDetail(db, project.runId);
    if (detail?.sourceReel) {
      shortcode = detail.sourceReel.shortcode;
      mp4Key = detail.sourceReel.mp4R2Key ?? mp4Key;
      firstFrameKey = detail.sourceReel.firstFrameR2Key ?? firstFrameKey;
      durationSeconds = detail.sourceReel.durationSeconds ?? 30;

      const [account] = await db
        .select()
        .from(sourceAccounts)
        .where(eq(sourceAccounts.id, detail.sourceReel.sourceAccountId))
        .limit(1);
      if (account?.handle) handle = account.handle;
    }
  }

  const storage = createAssetStorage(env);
  if (!(await storage.exists(firstFrameKey))) {
    const videoBuffer = await storage.getObject(mp4Key);
    const firstFrame = await extractFirstFrameFromMp4(env, videoBuffer);
    await storage.putObject({
      key: firstFrameKey,
      body: firstFrame.buffer,
      mimeType: "image/png",
    });
  }

  const manualRunRequest = {
    sourceAccount: { handle },
    sourceReel: {
      shortcode,
      reelUrl: `https://crosspost.local/projects/${publicId}`,
      mp4R2Key: mp4Key,
      firstFrameR2Key: firstFrameKey,
      durationSeconds,
    },
    model: {
      slug: model.slug,
      displayName: model.displayName,
    },
    executionMode: env.RUN_EXECUTION_MODE,
  } as const;

  // Detach from the previous run before reprocessing. Otherwise, while an inline
  // retry is still running (and hasn't yet linked the new run), a polling
  // `GET /projects/[id]` would sync against the OLD, terminal run and wrongly
  // flip this project back to "failed" mid-retry.
  await db
    .update(creatorProjects)
    .set({
      status: "processing",
      errorMessage: null,
      outputVideoKey: null,
      runId: null,
      // Reset the one-shot notification guard so the retry's final outcome
      // (ready or failed) can notify again — a prior notification must not
      // permanently suppress the email for a fresh run.
      readyNotifiedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(creatorProjects.id, project.id));

  if (env.RUN_EXECUTION_MODE === "queued") {
    const queued = await enqueueManualRun(db, manualRunRequest, {
      idempotencyKey: `creator_retry:${publicId}:${Date.now()}`,
    });

    await db
      .update(creatorProjects)
      .set({
        runId: queued.run.id,
        sourceReelId: queued.prepared.sourceReel.id,
        updatedAt: new Date(),
      })
      .where(eq(creatorProjects.id, project.id));
  } else {
    const result = await executeManualRunInline(env, db, manualRunRequest);
    const [run] = await db.select().from(runs).where(eq(runs.id, result.runId)).limit(1);
    const failed =
      result.status !== "delivered"
        ? await latestRunFailureMessage(db, result.runId, run?.currentStage)
        : null;

    await db
      .update(creatorProjects)
      .set({
        runId: result.runId,
        sourceReelId: run?.sourceReelId ?? project.sourceReelId,
        outputVideoKey: result.video?.r2Key ?? null,
        status: result.status === "delivered" ? "ready" : "failed",
        errorMessage: failed,
        updatedAt: new Date(),
      })
      .where(eq(creatorProjects.id, project.id));

    if (result.status === "delivered") {
      await prepareCreatorProjectExports(env, db, project.id);
      await maybeNotifyCreatorProjectReady(env, db, project.id);
    } else {
      await maybeNotifyCreatorProjectStatus(env, db, project.id);
    }
  }

  return (await getCreatorProject(db, userId, publicId)) ?? project;
}

async function deleteRunCascade(db: DbClient, runId: number) {
  await db.update(runs).set({ exceptionId: null }).where(eq(runs.id, runId));
  await db.delete(deliveries).where(eq(deliveries.runId, runId));
  await db.delete(videoRenders).where(eq(videoRenders.runId, runId));
  await db.delete(imageCandidates).where(eq(imageCandidates.runId, runId));
  await db.delete(stageRuns).where(eq(stageRuns.runId, runId));
  await db.delete(exceptions).where(eq(exceptions.runId, runId));
  await db.delete(runJobs).where(eq(runJobs.runId, runId));
  await db.update(batchItems).set({ runId: null }).where(eq(batchItems.runId, runId));
  await db.delete(runs).where(eq(runs.id, runId));
}

export async function adminDeleteCreatorProject(db: DbClient, publicId: string) {
  const [project] = await db
    .select()
    .from(creatorProjects)
    .where(eq(creatorProjects.publicId, publicId))
    .limit(1);

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.runId) {
    await deleteRunCascade(db, project.runId);
  }

  await db.delete(creatorProjects).where(eq(creatorProjects.id, project.id));

  await writeAuditEvent(db, {
    action: "creator_project.deleted",
    entityType: "creator_project",
    entityId: project.publicId,
    payload: {
      externalUserId: project.externalUserId,
      runId: project.runId,
      title: project.title,
    },
  });

  return { publicId: project.publicId, runId: project.runId };
}

export async function adminDeleteCreatorUser(db: DbClient, userId: string) {
  const projects = await db
    .select({ publicId: creatorProjects.publicId })
    .from(creatorProjects)
    .where(eq(creatorProjects.externalUserId, userId));

  for (const project of projects) {
    await adminDeleteCreatorProject(db, project.publicId);
  }

  const deletedProjectCount = projects.length;

  const deletedBatches = await db
    .delete(creatorBatches)
    .where(eq(creatorBatches.externalUserId, userId))
    .returning({ id: creatorBatches.id });

  const personalWorkspaces = await db
    .select({ id: creatorWorkspaces.id })
    .from(creatorWorkspaces)
    .where(eq(creatorWorkspaces.ownerUserId, userId));
  const personalWorkspaceIds = personalWorkspaces.map((workspace) => workspace.id);

  if (personalWorkspaceIds.length > 0) {
    await db
      .delete(creatorWorkspaceInvites)
      .where(inArray(creatorWorkspaceInvites.workspaceId, personalWorkspaceIds));
    await db
      .delete(creatorWorkspaceMembers)
      .where(inArray(creatorWorkspaceMembers.workspaceId, personalWorkspaceIds));
    await db.delete(creatorWorkspaces).where(inArray(creatorWorkspaces.id, personalWorkspaceIds));
  }

  await db.delete(creatorWorkspaceMembers).where(eq(creatorWorkspaceMembers.userId, userId));
  await db.delete(creatorWorkspaceInvites).where(eq(creatorWorkspaceInvites.invitedByUserId, userId));
  await db.delete(creatorWorkspaceInvites).where(eq(creatorWorkspaceInvites.acceptedUserId, userId));

  await writeAuditEvent(db, {
    action: "creator_user.deleted",
    entityType: "creator_user",
    entityId: userId,
    payload: {
      deletedProjectCount,
      deletedBatchCount: deletedBatches.length,
      deletedWorkspaceCount: personalWorkspaceIds.length,
    },
  });

  return {
    userId,
    deletedProjectCount,
    deletedBatchCount: deletedBatches.length,
    deletedWorkspaceCount: personalWorkspaceIds.length,
  };
}
