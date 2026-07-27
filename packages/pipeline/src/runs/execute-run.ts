import {
  buildNormalizedImageKey,
  buildSourceFirstFrameKey,
  buildSourceMp4Key,
  buildLabeledImageInputs,
  IMAGE_CANDIDATES_PER_CALL,
  type AppEnv,
} from "@crosspost/shared";
import type { ManualRunRequest } from "@crosspost/shared";
import type { DbClient } from "@crosspost/db";
import type { models, sourceReels } from "@crosspost/db";
import { renderPromptTemplate } from "../prompts/render";
import { ImageProviderError, runImageGenerationChain } from "../providers/image-chain";
import { runVideoGeneration } from "../providers/video-provider";
import { runImageQc } from "../qc/image-qc";
import { runVideoQc } from "../qc/video-qc";
import {
  createDeliveryRecord,
  createImageCandidateRecord,
  createRunRecord,
  createStageRunRecord,
  createVideoRenderRecord,
  getActivePrompt,
  getModelReferences,
  openException,
  updateRun,
  upsertModel,
  upsertSourceAccount,
  upsertSourceReel,
  writeRunAudit,
} from "../repositories/runs";
import { resolveOpenExceptionsForRun } from "../repositories/exceptions";
import { getOutputSettings } from "../repositories/engine-settings";
import { getEnabledProviderChain } from "../repositories/provider-configs";
import { getRunDetail } from "../repositories/run-detail";
import { markSourceReelsAsUsed } from "../repositories/sources-registry";
import { createAssetStorage, type AssetStorage } from "../storage/index";
import { deliverRunAssets } from "../delivery/deliver-run";
import { notifyRunDelivered, notifyRunException } from "../notifications/telegram";

export interface RunExecutionResult {
  runId: number;
  status: string;
  providerId?: string | null;
  videoProviderId?: string | null;
  winnerCandidateId?: number | null;
  image?: { r2Key: string } | null;
  video?: { r2Key: string } | null;
  delivery?: { drivePath?: string | null; r2Key?: string | null } | null;
}

export interface PreparedManualRun {
  model: typeof models.$inferSelect;
  sourceReel: typeof sourceReels.$inferSelect;
  mp4R2Key: string;
  firstFrameR2Key: string;
  input: ManualRunRequest;
}

function buildPublicUrl(storage: AssetStorage, key?: string | null) {
  if (!key) return "";
  return storage.getPublicUrl(key) ?? `local://${key}`;
}

export async function prepareManualRun(
  db: DbClient,
  input: ManualRunRequest,
): Promise<PreparedManualRun> {
  const model = await upsertModel(db, input.model);
  const sourceAccount = await upsertSourceAccount(db, input.sourceAccount.handle);

  const mp4R2Key =
    input.sourceReel.mp4R2Key ??
    buildSourceMp4Key(sourceAccount.handle, input.sourceReel.shortcode);
  const firstFrameR2Key =
    input.sourceReel.firstFrameR2Key ??
    buildSourceFirstFrameKey(sourceAccount.handle, input.sourceReel.shortcode);

  const sourceReel = await upsertSourceReel(db, {
    sourceAccountId: sourceAccount.id,
    shortcode: input.sourceReel.shortcode,
    reelUrl: input.sourceReel.reelUrl,
    caption: input.sourceReel.caption,
    viewCount: input.sourceReel.viewCount,
    durationSeconds: input.sourceReel.durationSeconds,
    mp4R2Key,
    firstFrameR2Key,
  });

  return { model, sourceReel, mp4R2Key, firstFrameR2Key, input };
}

export async function executeRunPipeline(
  env: AppEnv,
  db: DbClient,
  runId: number,
  prepared: PreparedManualRun,
): Promise<RunExecutionResult> {
  const storage = createAssetStorage(env);
  const { model, sourceReel, mp4R2Key, firstFrameR2Key, input } = prepared;

  await writeRunAudit(db, {
    action: "run.started",
    entityType: "run",
    entityId: String(runId),
    payload: { source: "pipeline", modelSlug: model.slug, shortcode: sourceReel.shortcode },
  });

  try {
    await updateRun(db, runId, { status: "started", currentStage: "started" });

    const references = await getModelReferences(db, model.id);
    const referenceUrls = references.slice(0, 3).map((ref) => buildPublicUrl(storage, ref.r2Key));
    const sourceFirstFrameUrl = buildPublicUrl(storage, firstFrameR2Key);
    const sourceMp4Url = buildPublicUrl(storage, mp4R2Key);

    const imagePrompt = await getActivePrompt(db, "image_gen");
    const videoPrompt = await getActivePrompt(db, "video_gen");

    const promptContext = {
      modelSlug: model.slug,
      modelDisplayName: model.displayName,
      sourceReelShortcode: sourceReel.shortcode,
      sourceReelUrl: sourceReel.reelUrl,
      operatorInstruction: input.prompt,
    };

    const renderedImagePrompt = renderPromptTemplate(imagePrompt?.body ?? "", promptContext);
    const renderedVideoPrompt = renderPromptTemplate(videoPrompt?.body ?? "", promptContext);

    await updateRun(db, runId, { status: "image_gen", currentStage: "image_gen" });

    const labeledInputs = buildLabeledImageInputs({
      referenceImageUrls: referenceUrls,
      sourceFirstFrameUrl: sourceFirstFrameUrl,
    });

    const outputSettings = await getOutputSettings(db);
    const [imageProviders, videoProviders] = await Promise.all([
      getEnabledProviderChain(db, "image_gen"),
      getEnabledProviderChain(db, "video_gen"),
    ]);

    const imageResult = await runImageGenerationChain(
      env,
      storage,
      {
        runId,
        modelSlug: model.slug,
        sourceShortcode: sourceReel.shortcode,
        renderedPrompt: renderedImagePrompt,
        referenceImageUrls: referenceUrls,
        sourceFirstFrameUrl,
        labeledInputs,
        candidateCount: IMAGE_CANDIDATES_PER_CALL,
        outputSettings,
      },
      imageProviders,
    );

    const imageStage = await createStageRunRecord(db, {
      runId,
      stage: "image_gen",
      provider: imageResult.providerId,
      status: "success",
      costCents: imageResult.costCents,
      latencyMs: imageResult.latencyMs,
      requestPayload: imageResult.requestPayload,
      responsePayload: imageResult.responsePayload,
      promptStage: "image_gen",
      promptScope: imagePrompt?.scope,
      promptVersion: imagePrompt?.version,
      renderedPrompt: renderedImagePrompt,
      outputR2Keys: imageResult.images.map((image) => image.r2Key),
    });

    await updateRun(db, runId, {
      status: "image_qc",
      currentStage: "image_qc",
      costCents: imageResult.costCents,
      totalLatencyMs: imageResult.latencyMs,
    });

    let winnerGenerated = imageResult.images[0]!;
    let winnerQc = await runImageQc(storage, {
      modelSlug: model.slug,
      sourceShortcode: sourceReel.shortcode,
      runId,
      providerId: imageResult.providerId,
      candidateR2Key: winnerGenerated.r2Key,
      width: winnerGenerated.width,
      height: winnerGenerated.height,
      ordinal: winnerGenerated.ordinal,
    });

    const qcResults: Array<{
      generated: (typeof imageResult.images)[number];
      qc: Awaited<ReturnType<typeof runImageQc>>;
    }> = [{ generated: winnerGenerated, qc: winnerQc }];

    for (const generated of imageResult.images.slice(1)) {
      const qc = await runImageQc(storage, {
        modelSlug: model.slug,
        sourceShortcode: sourceReel.shortcode,
        runId,
        providerId: imageResult.providerId,
        candidateR2Key: generated.r2Key,
        width: generated.width,
        height: generated.height,
        ordinal: generated.ordinal,
      });
      qcResults.push({ generated, qc });
      if (!winnerQc.passed && qc.passed) {
        winnerGenerated = generated;
        winnerQc = qc;
      }
    }

    let candidate = await createImageCandidateRecord(db, {
      runId,
      ordinal: qcResults[0]!.generated.ordinal,
      provider: imageResult.providerId,
      r2Key: qcResults[0]!.generated.r2Key,
      normalizedR2Key: qcResults[0]!.qc.normalizedR2Key,
      width: qcResults[0]!.generated.width,
      height: qcResults[0]!.generated.height,
      qcPayload: qcResults[0]!.qc.payload,
      qcPassed: qcResults[0]!.qc.passed,
      combinedScore: qcResults[0]!.qc.combinedScore,
      isWinner: qcResults[0]!.generated.ordinal === winnerGenerated.ordinal && winnerQc.passed,
      costCents: imageResult.costCents,
    });

    for (const row of qcResults.slice(1)) {
      const record = await createImageCandidateRecord(db, {
        runId,
        ordinal: row.generated.ordinal,
        provider: imageResult.providerId,
        r2Key: row.generated.r2Key,
        normalizedR2Key: row.qc.normalizedR2Key,
        width: row.generated.width,
        height: row.generated.height,
        qcPayload: row.qc.payload,
        qcPassed: row.qc.passed,
        combinedScore: row.qc.combinedScore,
        isWinner: row.generated.ordinal === winnerGenerated.ordinal && winnerQc.passed,
        costCents: 0,
      });
      if (row.generated.ordinal === winnerGenerated.ordinal) {
        candidate = record;
      }
    }

    await createStageRunRecord(db, {
      runId,
      stage: "image_qc",
      status: winnerQc.passed ? "success" : "failed",
      requestPayload: {
        candidateCount: imageResult.images.length,
        winnerOrdinal: winnerGenerated.ordinal,
      },
      responsePayload: winnerQc.payload,
      outputR2Keys: qcResults.map((row) => row.qc.normalizedR2Key),
    });

    if (!winnerQc.passed) {
      await openException(db, {
        runId,
        stage: "image_qc",
        reason: "Image QC failed for all generated candidates",
        payload: winnerQc.payload,
      });
      return summarizeRun(await getRunDetail(db, runId));
    }

    await updateRun(db, runId, { status: "video_gen", currentStage: "video_gen" });

    const normalizedImageUrl = buildPublicUrl(storage, winnerQc.normalizedR2Key);
    const videoResult = await runVideoGeneration(
      env,
      storage,
      {
        runId,
        modelSlug: model.slug,
        sourceShortcode: sourceReel.shortcode,
        renderedPrompt: renderedVideoPrompt,
        generatedImageUrl: normalizedImageUrl,
        sourceMp4Url,
        durationSeconds: sourceReel.durationSeconds ?? undefined,
      },
      videoProviders[0],
    );

    await createStageRunRecord(db, {
      runId,
      stage: "video_gen",
      provider: videoResult.providerId,
      status: "success",
      costCents: videoResult.costCents,
      latencyMs: videoResult.latencyMs,
      requestPayload: videoResult.requestPayload,
      responsePayload: videoResult.responsePayload,
      promptStage: "video_gen",
      promptScope: videoPrompt?.scope,
      promptVersion: videoPrompt?.version,
      renderedPrompt: renderedVideoPrompt,
      outputR2Keys: [videoResult.video.r2Key],
    });

    await updateRun(db, runId, {
      status: "video_qc",
      currentStage: "video_qc",
      costCents: (imageStage.costCents ?? 0) + videoResult.costCents,
      totalLatencyMs: (imageStage.latencyMs ?? 0) + videoResult.latencyMs,
    });

    const videoQc = await runVideoQc(storage, {
      r2Key: videoResult.video.r2Key,
      width: videoResult.video.width,
      height: videoResult.video.height,
      durationSeconds: videoResult.video.durationSeconds,
      sourceDurationSeconds: sourceReel.durationSeconds ?? undefined,
    });

    await createStageRunRecord(db, {
      runId,
      stage: "video_qc",
      status: videoQc.passed ? "success" : "failed",
      requestPayload: { videoR2Key: videoResult.video.r2Key },
      responsePayload: videoQc.payload,
      outputR2Keys: [videoResult.video.r2Key],
    });

    if (!videoQc.passed) {
      await openException(db, {
        runId,
        stage: "video_qc",
        reason: "Video QC failed",
        payload: videoQc.payload,
      });
      return summarizeRun(await getRunDetail(db, runId));
    }

    const render = await createVideoRenderRecord(db, {
      runId,
      provider: videoResult.providerId,
      r2Key: videoResult.video.r2Key,
      width: videoResult.video.width,
      height: videoResult.video.height,
      durationSeconds: videoResult.video.durationSeconds,
      qcPayload: videoQc.payload,
      qcPassed: true,
      isWinner: true,
      costCents: videoResult.costCents,
    });

    await updateRun(db, runId, { status: "delivering", currentStage: "delivering" });

    let deliveryResult;
    try {
      deliveryResult = await deliverRunAssets(env, storage, {
        runId,
        modelSlug: model.slug,
        sourceShortcode: sourceReel.shortcode,
        videoR2Key: videoResult.video.r2Key,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Drive delivery failed";
      await openException(db, {
        runId,
        stage: "delivery",
        reason: message,
        payload: { error: message },
      });
      await notifyRunException(env, { runId, stage: "delivery", reason: message });
      return summarizeRun(await getRunDetail(db, runId));
    }

    const delivery = await createDeliveryRecord(db, {
      runId,
      destination: deliveryResult.destination,
      r2Key: deliveryResult.r2Key,
      drivePath: deliveryResult.drivePath,
      payload: deliveryResult.payload,
    });

    await createStageRunRecord(db, {
      runId,
      stage: "delivery",
      status: "success",
      outputR2Keys: [videoResult.video.r2Key],
      responsePayload: {
        drivePath: deliveryResult.drivePath,
        destination: deliveryResult.destination,
        driveFileId: deliveryResult.driveFileId,
        webViewLink: deliveryResult.webViewLink,
      },
    });

    await updateRun(db, runId, {
      status: "delivered",
      currentStage: "delivered",
      finishedAt: new Date(),
      costCents: imageResult.costCents + videoResult.costCents,
      totalLatencyMs: imageResult.latencyMs + videoResult.latencyMs,
    });

    await resolveOpenExceptionsForRun(db, runId);

    await writeRunAudit(db, {
      action: "run.delivered",
      entityType: "run",
      entityId: String(runId),
      payload: {
        providerId: imageResult.providerId,
        videoProviderId: videoResult.providerId,
        winnerCandidateId: candidate.id,
        winnerRenderId: render.id,
        deliveryId: delivery.id,
        drivePath: deliveryResult.drivePath,
      },
    });

    await notifyRunDelivered(env, {
      runId,
      modelSlug: model.slug,
      shortcode: sourceReel.shortcode,
      drivePath: deliveryResult.drivePath,
    });

    return summarizeRun(await getRunDetail(db, runId));
  } catch (error) {
    const reason =
      error instanceof ImageProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Run execution failed";

    await openException(db, {
      runId,
      stage: "pipeline",
      reason,
      payload: { error: reason },
    });

    await notifyRunException(env, { runId, stage: "pipeline", reason });

    return summarizeRun(await getRunDetail(db, runId));
  }
}

export async function executeManualRun(
  env: AppEnv,
  db: DbClient,
  input: ManualRunRequest,
): Promise<RunExecutionResult> {
  const prepared = await prepareManualRun(db, input);
  const run = await createRunRecord(db, {
    modelId: prepared.model.id,
    sourceReelId: prepared.sourceReel.id,
  });

  await writeRunAudit(db, {
    action: "run.created",
    entityType: "run",
    entityId: String(run.id),
    payload: { source: "manual", modelSlug: prepared.model.slug, shortcode: prepared.sourceReel.shortcode },
  });

  await markSourceReelsAsUsed(db, [prepared.sourceReel.id]);

  return executeRunPipeline(env, db, run.id, prepared);
}

function summarizeRun(detail: Awaited<ReturnType<typeof getRunDetail>>): RunExecutionResult {
  if (!detail) {
    throw new Error("Run detail missing after execution");
  }

  return {
    runId: detail.run.id,
    status: detail.run.status,
    providerId: detail.providerId,
    videoProviderId: detail.videoProviderId,
    winnerCandidateId: detail.winnerCandidateId,
    image: detail.image,
    video: detail.video,
    delivery: detail.delivery
      ? { drivePath: detail.delivery.drivePath, r2Key: detail.delivery.r2Key }
      : null,
  };
}

export async function executeDemoRun(env: AppEnv, db: DbClient): Promise<RunExecutionResult> {
  return executeManualRun(env, db, {
    sourceAccount: { handle: "demo-source", followerCount: 250000 },
    sourceReel: {
      shortcode: "demo-vertical-1",
      reelUrl: "https://www.instagram.com/reel/demo-vertical-1/",
      postedAt: new Date().toISOString(),
      caption: "Demo vertical fixture reel",
      viewCount: 900000,
      durationSeconds: 7,
      firstFrameR2Key: "fixtures/reels/demo-vertical-1/first-frame.png",
      mp4R2Key: "fixtures/reels/demo-vertical-1/source.mp4",
    },
    model: { slug: "hazel", displayName: "Hazel" },
    prompt: "Generate a photorealistic vertical fashion frame preserving source pose and identity.",
    executionMode: "inline",
  });
}
