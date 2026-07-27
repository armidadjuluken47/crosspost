import type { getRunDetail, EnrichedRunRow } from "@crosspost/pipeline";
import { parseLabeledInputsFromStagePayload } from "@crosspost/shared";
import { assetUrl } from "@/lib/assets";

export type SerializedRunListItem = EnrichedRunRow & {
  thumbnailUrl: string | undefined;
};

export type PromptTrace = {
  version: number | null;
  scope: string | null;
  body: string | null;
};

export type ImageInputTrace = {
  slot: number;
  role: string;
  label: string;
};

export type ImageCandidatePreview = {
  id: number;
  ordinal: number;
  isWinner: boolean;
  previewUrl: string | undefined;
};

export type SerializedRunDetail = NonNullable<Awaited<ReturnType<typeof getRunDetail>>> & {
  thumbnailUrl: string | undefined;
  imageUrl: string | undefined;
  videoUrl: string | undefined;
  imageInputs: ImageInputTrace[];
  imageCandidates: ImageCandidatePreview[];
  prompts: {
    image: PromptTrace | null;
    video: PromptTrace | null;
  };
  errorMessage: string | null;
};

export function serializeRunListItem(row: EnrichedRunRow): SerializedRunListItem {
  return {
    ...row,
    thumbnailUrl: assetUrl(row.firstFrameR2Key),
  };
}

function promptFromStage(
  stages: NonNullable<Awaited<ReturnType<typeof getRunDetail>>>["stages"],
  stageName: string,
): PromptTrace | null {
  const stage =
    stages.find((row) => row.stage === stageName && row.renderedPrompt) ??
    stages.find((row) => row.stage === stageName);
  if (!stage) return null;
  return {
    version: stage.promptVersion,
    scope: stage.promptScope,
    body: stage.renderedPrompt,
  };
}

function imageInputsFromStage(
  stages: NonNullable<Awaited<ReturnType<typeof getRunDetail>>>["stages"],
): ImageInputTrace[] {
  const imageStage = stages.find((row) => row.stage === "image_gen" && row.status === "success");
  const payload = imageStage?.requestPayload as Record<string, unknown> | null | undefined;
  return parseLabeledInputsFromStagePayload(payload);
}

export function serializeRunDetail(
  detail: NonNullable<Awaited<ReturnType<typeof getRunDetail>>>,
): SerializedRunDetail {
  const failedStage = detail.stages.find((stage) => stage.status === "failed");
  const openException = detail.exceptions.find((exc) => exc.status === "open");

  return {
    ...detail,
    thumbnailUrl: assetUrl(detail.sourceReel?.firstFrameR2Key),
    imageUrl: assetUrl(detail.image?.r2Key),
    videoUrl: assetUrl(detail.video?.r2Key),
    imageInputs: imageInputsFromStage(detail.stages),
    imageCandidates: detail.candidates.map((candidate) => ({
      id: candidate.id,
      ordinal: candidate.ordinal,
      isWinner: candidate.isWinner,
      previewUrl: assetUrl(candidate.normalizedR2Key ?? candidate.r2Key),
    })),
    prompts: {
      image: promptFromStage(detail.stages, "image_gen"),
      video: promptFromStage(detail.stages, "video_gen"),
    },
    errorMessage: openException?.reason ?? failedStage?.error ?? null,
  };
}
