import {
  buildGeneratedImageKey,
  buildNormalizedImageKey,
  IMAGE_CANDIDATES_PER_CALL,
  imageUrlsFromLabeledInputs,
  type AppEnv,
} from "@crosspost/shared";
import { loadFixtureImageBuffer } from "../media/assets";
import { normalizeImageToNineSixteen } from "../media/normalize";
import type { AssetStorage } from "../storage/local";
import type { ImageGenerationInput, ImageGenerationResult } from "./types";

export async function generateFixtureImage(
  env: AppEnv,
  storage: AssetStorage,
  input: ImageGenerationInput,
): Promise<ImageGenerationResult> {
  const started = Date.now();
  const rawBuffer = await loadFixtureImageBuffer();
  const candidateCount = input.candidateCount ?? IMAGE_CANDIDATES_PER_CALL;
  const storedCandidates = [];

  for (let ordinal = 1; ordinal <= candidateCount; ordinal += 1) {
    const rawKey = buildGeneratedImageKey(
      input.modelSlug,
      input.sourceShortcode,
      input.runId,
      input.providerId,
      ordinal,
    );

    await storage.putObject({
      key: rawKey,
      body: rawBuffer,
      mimeType: "image/png",
    });

    const normalized = await normalizeImageToNineSixteen(env, rawBuffer);
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

    storedCandidates.push({
      ordinal,
      r2Key: rawKey,
      mimeType: "image/png",
      width: normalized.width,
      height: normalized.height,
      normalizedR2Key: normalizedKey,
      publicUrl: stored.publicUrl,
    });
  }

  const latencyMs = Date.now() - started;
  const imageUrls = imageUrlsFromLabeledInputs(input.labeledInputs);

  return {
    providerId: input.providerId,
    providerModel: input.providerModel,
    costCents: 6,
    latencyMs,
    requestPayload: {
      mode: "fixture",
      labeledInputs: input.labeledInputs,
      images: imageUrls,
      renderedPrompt: input.renderedPrompt,
      num_images: candidateCount,
    },
    responsePayload: {
      providerModel: input.providerModel,
      costCents: 6,
      generatedAt: new Date().toISOString(),
      images: storedCandidates,
    },
    images: storedCandidates.map(({ normalizedR2Key: _n, publicUrl: _p, ...asset }) => asset),
  };
}
