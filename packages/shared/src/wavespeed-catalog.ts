import type { ProviderStage } from "./providers";
import {
  assessSchemaCompatibility,
  type AmveModelCompatibility,
  type WaveSpeedCatalogModel,
} from "./wavespeed-schema";

export type { AmveModelCompatibility, WaveSpeedCatalogModel, WaveSpeedApiSchemaEntry } from "./wavespeed-schema";

const IMAGE_STAGE_TYPES = new Set([
  "image-editing",
  "image-edit",
  "image-to-image",
  "text-to-image",
  "image-generation",
]);

const VIDEO_STAGE_TYPES = new Set([
  "image-to-video",
  "text-to-video",
  "motion-control",
  "video-generation",
  "video-editing",
]);

function modelIdHintsImageEdit(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return (
    id.includes("/edit") ||
    id.includes("edit-multi") ||
    id.includes("image-to-image") ||
    id.includes("kontext")
  );
}

function modelIdHintsMotionVideo(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return (
    id.includes("motion-control") ||
    id.includes("image-to-video") ||
    id.includes("/i2v") ||
    id.includes("/t2v")
  );
}

export function catalogModelMatchesStage(
  model: WaveSpeedCatalogModel,
  stage: Extract<ProviderStage, "image_gen" | "video_gen">,
): boolean {
  const type = (model.type ?? "").toLowerCase();
  const id = model.model_id.toLowerCase();

  if (stage === "image_gen") {
    if (IMAGE_STAGE_TYPES.has(type)) return true;
    if (type.includes("image") && !type.includes("video")) return true;
    return modelIdHintsImageEdit(id);
  }

  if (VIDEO_STAGE_TYPES.has(type)) return true;
  if (type.includes("video") && !type.includes("image-edit")) return true;
  return modelIdHintsMotionVideo(id);
}

export function filterCatalogForStage(
  models: WaveSpeedCatalogModel[],
  stage: Extract<ProviderStage, "image_gen" | "video_gen">,
): WaveSpeedCatalogModel[] {
  return models.filter((model) => catalogModelMatchesStage(model, stage));
}

export function searchCatalogModels(
  models: WaveSpeedCatalogModel[],
  query: string,
): WaveSpeedCatalogModel[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return models;

  return models.filter((model) => {
    const haystack = `${model.model_id} ${model.name} ${model.type ?? ""} ${model.description ?? ""}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export function inferCrossPostCompatibility(
  model: WaveSpeedCatalogModel,
  stage: Extract<ProviderStage, "image_gen" | "video_gen">,
): AmveModelCompatibility {
  const schemaResult = assessSchemaCompatibility(model, stage);
  if (
    schemaResult.level !== "experimental" ||
    !schemaResult.reasons[0]?.includes("No request schema")
  ) {
    return schemaResult.level;
  }

  const id = model.model_id.toLowerCase();
  const type = (model.type ?? "").toLowerCase();

  if (stage === "image_gen") {
    if (id.includes("/edit") || id.includes("edit-multi") || type.includes("edit")) {
      return "supported";
    }
    if (type.includes("image") || modelIdHintsImageEdit(id)) {
      return "experimental";
    }
    return "unsupported";
  }

  if (id.includes("motion-control") || type.includes("motion")) {
    return "supported";
  }
  if (id.includes("image-to-video") || type.includes("image-to-video")) {
    return "experimental";
  }
  if (type.includes("video") || modelIdHintsMotionVideo(id)) {
    return "experimental";
  }
  return "unsupported";
}

export function buildCustomProviderId(modelId: string): string {
  const slug = modelId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `custom_${slug}`.slice(0, 120);
}

export function catalogModelToDisplayName(model: WaveSpeedCatalogModel): string {
  return model.name?.trim() || model.model_id;
}
