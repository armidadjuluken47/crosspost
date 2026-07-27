import type { LabeledImageInput, OutputSettings } from "@crosspost/shared";

export interface GeneratedImageAsset {
  ordinal: number;
  r2Key: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface ImageGenerationResult {
  providerId: string;
  providerModel: string;
  costCents: number;
  latencyMs: number;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  images: GeneratedImageAsset[];
}

export interface VideoGenerationResult {
  providerId: string;
  providerModel: string;
  costCents: number;
  latencyMs: number;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  video: {
    r2Key: string;
    mimeType: string;
    width: number;
    height: number;
    durationSeconds: number;
  };
}

export interface ImageGenerationInput {
  providerId: string;
  providerModel: string;
  runId: number;
  modelSlug: string;
  sourceShortcode: string;
  renderedPrompt: string;
  /** @deprecated use labeledInputs — kept for fixture payloads */
  referenceImageUrls: string[];
  sourceFirstFrameUrl: string;
  labeledInputs: LabeledImageInput[];
  candidateCount?: number;
  outputSettings?: OutputSettings;
}

export interface VideoGenerationInput {
  providerId: string;
  providerModel: string;
  runId: number;
  modelSlug: string;
  sourceShortcode: string;
  renderedPrompt: string;
  generatedImageUrl: string;
  sourceMp4Url: string;
  durationSeconds?: number;
}
