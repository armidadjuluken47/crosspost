import {
  buildGeneratedImageKey,
  buildNormalizedImageKey,
  DEFAULT_OUTPUT_SETTINGS,
  IMAGE_CANDIDATES_PER_CALL,
  imageUrlsFromLabeledInputs,
  type AppEnv,
  type LabeledImageInput,
  type OutputSettings,
} from "@crosspost/shared";
import { downloadBinary } from "../../ingestion/download";
import { normalizeImageToNineSixteen } from "../../media/normalize";
import type { AssetStorage } from "../../storage/local";
import type { GeneratedImageAsset, ImageGenerationInput, ImageGenerationResult } from "../types";
import { WaveSpeedError } from "./errors";
import { runWaveSpeedTask } from "./client";
import {
  isNanoBanana2Edit,
  isNanoBananaEditMulti,
  planImageCandidateBatches,
} from "./nano-banana-batches";
import { ProviderMediaResolver, redactMediaUrlsForAudit } from "./resolve-media-url";

const PROVIDER_COST_CENTS: Record<string, number> = {
  wavespeed_nano_banana_2: 7,
  wavespeed_nano_banana_pro: 7,
  wavespeed_flux_kontext_max: 10,
  wavespeed_seedream_v45: 8,
};

function resolveOutputSettings(input: ImageGenerationInput): OutputSettings {
  return input.outputSettings ?? DEFAULT_OUTPUT_SETTINGS;
}

function buildImageRequestBody(
  input: ImageGenerationInput,
  labeledInputs: LabeledImageInput[],
  numImages: number,
): Record<string, unknown> {
  const imageUrls = imageUrlsFromLabeledInputs(labeledInputs);
  const outputSettings = resolveOutputSettings(input);

  if (imageUrls.length === 0) {
    throw new WaveSpeedError("No input image URLs for WaveSpeed image generation", "invalid_input", {
      retryable: false,
    });
  }

  const base = {
    prompt: input.renderedPrompt,
    images: imageUrls,
    image_urls: imageUrls,
    output_format: "png",
    enable_sync_mode: false,
    enable_base64_output: false,
    labeled_inputs: labeledInputs.map((row) => ({
      slot: row.slot,
      role: row.role,
      label: row.label,
      url: row.url,
    })),
    output_settings: outputSettings,
  };

  if (isNanoBanana2Edit(input.providerModel)) {
    return {
      ...base,
      aspect_ratio: outputSettings.imageAspectRatio,
      resolution: outputSettings.imageResolution,
    };
  }

  if (isNanoBananaEditMulti(input.providerModel)) {
    return {
      ...base,
      aspect_ratio: outputSettings.imageAspectRatio,
      num_images: numImages,
    };
  }

  if (input.providerModel.includes("flux-kontext")) {
    return {
      ...base,
      aspect_ratio: outputSettings.imageAspectRatio,
    };
  }

  return {
    ...base,
    aspect_ratio: outputSettings.imageAspectRatio,
    num_images: numImages,
  };
}

function guessMimeType(url: string) {
  const lower = url.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

async function storeGeneratedCandidate(
  env: AppEnv,
  storage: AssetStorage,
  input: ImageGenerationInput,
  outputUrl: string,
  ordinal: number,
): Promise<GeneratedImageAsset & { normalizedR2Key: string; publicUrl?: string }> {
  let rawBuffer: Buffer;
  try {
    rawBuffer = await downloadBinary(outputUrl, env.WAVESPEED_REQUEST_TIMEOUT_MS);
  } catch (error) {
    throw new WaveSpeedError(
      error instanceof Error ? error.message : "Failed to download WaveSpeed image output",
      "asset_download_failed",
      { retryable: true, cause: error },
    );
  }

  const outputSettings = resolveOutputSettings(input);
  const mimeType = guessMimeType(outputUrl);
  const rawKey = buildGeneratedImageKey(
    input.modelSlug,
    input.sourceShortcode,
    input.runId,
    input.providerId,
    ordinal,
  );

  await storage.putObject({ key: rawKey, body: rawBuffer, mimeType });

  const normalized = await normalizeImageToNineSixteen(env, rawBuffer, {
    width: outputSettings.normalizeWidth,
    height: outputSettings.normalizeHeight,
  });
  const normalizedKey = buildNormalizedImageKey(
    input.modelSlug,
    input.sourceShortcode,
    input.runId,
    input.providerId,
    ordinal,
  );

  const stored = await storage.putObject({
    key: normalizedKey,
    body: normalized.buffer,
    mimeType: "image/png",
  });

  return {
    ordinal,
    r2Key: rawKey,
    mimeType: "image/png",
    width: normalized.width,
    height: normalized.height,
    normalizedR2Key: normalizedKey,
    publicUrl: stored.publicUrl,
  };
}

export async function generateWaveSpeedImage(
  env: AppEnv,
  storage: AssetStorage,
  input: ImageGenerationInput,
): Promise<ImageGenerationResult> {
  const started = Date.now();
  const candidateCount = input.candidateCount ?? IMAGE_CANDIDATES_PER_CALL;
  const batchSizes = planImageCandidateBatches(input.providerModel, candidateCount);

  // WaveSpeed cannot fetch `/api/assets/...` or localhost — inline compressed local files.
  const mediaResolver = new ProviderMediaResolver(env, storage);
  const resolvedLabeledInputs: LabeledImageInput[] = await Promise.all(
    input.labeledInputs.map(async (row) => ({
      ...row,
      url: await mediaResolver.resolve(row.url),
    })),
  );

  const requestBodies = batchSizes.map((numImages) =>
    buildImageRequestBody(input, resolvedLabeledInputs, numImages),
  );

  const storedCandidates: Array<
    GeneratedImageAsset & { normalizedR2Key: string; publicUrl?: string }
  > = [];
  const allOutputUrls: string[] = [];
  const taskIds: string[] = [];
  let ordinal = 1;

  for (const requestBody of requestBodies) {
    const task = await runWaveSpeedTask(env, input.providerModel, requestBody);
    taskIds.push(task.taskId);

    const outputUrls = task.outputs.filter(Boolean);
    if (outputUrls.length === 0) {
      throw new WaveSpeedError("WaveSpeed image task returned no output URL", "malformed_response", {
        retryable: false,
      });
    }

    for (const outputUrl of outputUrls) {
      if (ordinal > candidateCount) break;

      storedCandidates.push(
        await storeGeneratedCandidate(env, storage, input, outputUrl, ordinal),
      );
      allOutputUrls.push(outputUrl);
      ordinal += 1;
    }
  }

  if (storedCandidates.length === 0) {
    throw new WaveSpeedError("WaveSpeed image task returned no output URL", "malformed_response", {
      retryable: false,
    });
  }

  const latencyMs = Date.now() - started;
  const unitCostCents = PROVIDER_COST_CENTS[input.providerId] ?? 10;
  const costCents = unitCostCents * storedCandidates.length;

  const auditRequestPayload =
    requestBodies.length === 1
      ? requestBodies[0]!
      : {
          labeled_inputs: requestBodies[0]!.labeled_inputs,
          batches: requestBodies,
        };

  return {
    providerId: input.providerId,
    providerModel: input.providerModel,
    costCents,
    latencyMs,
    requestPayload: redactMediaUrlsForAudit(auditRequestPayload),
    responsePayload: {
      providerModel: input.providerModel,
      costCents,
      generatedAt: new Date().toISOString(),
      taskIds,
      outputUrls: allOutputUrls,
      images: storedCandidates,
      batchCount: requestBodies.length,
    },
    images: storedCandidates.map(({ normalizedR2Key: _normalized, publicUrl: _publicUrl, ...asset }) => asset),
  };
}
