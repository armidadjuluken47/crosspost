import type { LabeledImageInput } from "./image-input-roles";
import type { OutputSettings } from "./output-settings";
import type { ProviderStage } from "./providers";

export type AmveModelCompatibility = "supported" | "experimental" | "unsupported";

export interface WaveSpeedApiSchemaEntry {
  type?: string;
  method?: string;
  api_path?: string;
  request_schema?: WaveSpeedRequestSchema;
}

export interface WaveSpeedCatalogModel {
  model_id: string;
  name: string;
  base_price?: number;
  description?: string;
  type?: string;
  api_schema?: { api_schemas?: WaveSpeedApiSchemaEntry[] };
  api_schemas?: WaveSpeedApiSchemaEntry[];
}

export interface WaveSpeedSchemaProperty {
  type?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  items?: { type?: string };
  maximum?: number;
  minimum?: number;
}

export interface WaveSpeedRequestSchema {
  type?: string;
  properties?: Record<string, WaveSpeedSchemaProperty>;
  required?: string[];
}

export interface AmveImageRequestContext {
  prompt: string;
  imageUrls: string[];
  labeledInputs: LabeledImageInput[];
  outputSettings: OutputSettings;
  numImages: number;
}

export interface AmveVideoRequestContext {
  prompt: string;
  generatedImageUrl: string;
  sourceMp4Url: string;
}

export interface SchemaCompatibilityResult {
  level: AmveModelCompatibility;
  reasons: string[];
  missingRequired: string[];
}

const PROMPT_KEYS = ["prompt", "text", "positive_prompt", "caption"] as const;
const IMAGE_ARRAY_KEYS = [
  "images",
  "image_urls",
  "input_images",
  "reference_images",
  "image_inputs",
] as const;
const IMAGE_SINGLE_KEYS = ["image", "input_image", "init_image", "first_frame_image"] as const;
const NUM_IMAGES_KEYS = ["num_images", "number_of_images", "n", "batch_size"] as const;
const ASPECT_KEYS = ["aspect_ratio"] as const;
const RESOLUTION_KEYS = ["resolution", "size"] as const;
const VIDEO_KEYS = ["video", "reference_video", "motion_video", "driver_video"] as const;
const MOTION_ORIENTATION_KEYS = ["character_orientation"] as const;
const KEEP_SOUND_KEYS = ["keep_original_sound", "keep_audio"] as const;

export function extractRequestSchema(
  model: WaveSpeedCatalogModel,
): WaveSpeedRequestSchema | null {
  const entries =
    model.api_schemas ??
    model.api_schema?.api_schemas ??
  [];

  const runSchema =
    entries.find((entry) => entry.type === "model_run" && entry.request_schema) ??
    entries.find((entry) => entry.request_schema);

  return runSchema?.request_schema ?? null;
}

export function schemaPropertyNames(schema: WaveSpeedRequestSchema | null): string[] {
  return Object.keys(schema?.properties ?? {});
}

function hasAnyKey(names: string[], keys: readonly string[]): boolean {
  const lower = new Set(names.map((name) => name.toLowerCase()));
  return keys.some((key) => lower.has(key));
}

function findPropertyName(names: string[], keys: readonly string[]): string | undefined {
  const lowerToActual = new Map(names.map((name) => [name.toLowerCase(), name]));
  for (const key of keys) {
    const match = lowerToActual.get(key);
    if (match) return match;
  }
  return undefined;
}

export function assessSchemaCompatibility(
  model: WaveSpeedCatalogModel,
  stage: Extract<ProviderStage, "image_gen" | "video_gen">,
): SchemaCompatibilityResult {
  const schema = extractRequestSchema(model);
  const propertyNames = schemaPropertyNames(schema);
  const missingRequired: string[] = [];
  const reasons: string[] = [];

  if (!schema || propertyNames.length === 0) {
    return {
      level: "experimental",
      reasons: ["No request schema published — CrossPost will use best-effort field mapping"],
      missingRequired,
    };
  }

  const required = schema.required ?? [];

  if (stage === "image_gen") {
    const hasPrompt = hasAnyKey(propertyNames, PROMPT_KEYS);
    const hasImageArray = hasAnyKey(propertyNames, IMAGE_ARRAY_KEYS);
    const hasImageSingle = hasAnyKey(propertyNames, IMAGE_SINGLE_KEYS);
    const acceptsMultipleImages =
      hasImageArray ||
      propertyNames.some((name) => {
        const prop = schema.properties?.[name];
        return prop?.type === "array" && IMAGE_SINGLE_KEYS.includes(name.toLowerCase() as never);
      });

    if (!hasPrompt) {
      missingRequired.push("prompt");
    }
    if (!hasImageArray && !hasImageSingle) {
      missingRequired.push("images");
    }

    if (missingRequired.length > 0) {
      return {
        level: "unsupported",
        reasons: [`Schema lacks CrossPost image fields: ${missingRequired.join(", ")}`],
        missingRequired,
      };
    }

    if (acceptsMultipleImages || hasImageArray) {
      reasons.push("Schema accepts multi-image edit input");
      return { level: "supported", reasons, missingRequired };
    }

    reasons.push("Schema accepts only a single image — 5-input workflow may be degraded");
    return { level: "experimental", reasons, missingRequired };
  }

  const hasPrompt = hasAnyKey(propertyNames, PROMPT_KEYS);
  const hasVideo = hasAnyKey(propertyNames, VIDEO_KEYS);
  const hasStartImage = hasAnyKey(propertyNames, IMAGE_SINGLE_KEYS);

  if (!hasPrompt && required.some((field) => PROMPT_KEYS.includes(field as never))) {
    missingRequired.push("prompt");
  }
  if (!hasVideo) {
    missingRequired.push("video");
  }
  if (!hasStartImage) {
    missingRequired.push("image");
  }

  if (missingRequired.length > 0) {
    return {
      level: "unsupported",
      reasons: [`Schema lacks CrossPost video fields: ${missingRequired.join(", ")}`],
      missingRequired,
    };
  }

  if (hasVideo && hasStartImage) {
    const motionControl =
      model.model_id.toLowerCase().includes("motion-control") ||
      (model.type ?? "").toLowerCase().includes("motion");
    if (motionControl) {
      reasons.push("Motion-control schema detected");
      return { level: "supported", reasons, missingRequired };
    }
    reasons.push("Image + video inputs available");
    return { level: "experimental", reasons, missingRequired };
  }

  return { level: "experimental", reasons: ["Partial video schema match"], missingRequired };
}

function defaultForProperty(property: WaveSpeedSchemaProperty): unknown {
  if (property.default !== undefined) return property.default;
  if (property.enum && property.enum.length > 0) return property.enum[0];
  if (property.type === "boolean") return false;
  if (property.type === "integer" || property.type === "number") return property.minimum ?? 0;
  if (property.type === "array") return [];
  return undefined;
}

function assignIfPresent(
  body: Record<string, unknown>,
  propertyName: string,
  value: unknown,
) {
  if (value === undefined) return;
  body[propertyName] = value;
}

export function buildImageRequestFromSchema(
  model: WaveSpeedCatalogModel,
  context: AmveImageRequestContext,
): Record<string, unknown> {
  const schema = extractRequestSchema(model);
  if (!schema?.properties) {
    throw new Error(`Model ${model.model_id} has no request schema`);
  }

  const names = schemaPropertyNames(schema);
  const body: Record<string, unknown> = {};

  const promptKey = findPropertyName(names, PROMPT_KEYS);
  if (promptKey) {
    body[promptKey] = context.prompt;
  }

  const imageArrayKey = findPropertyName(names, IMAGE_ARRAY_KEYS);
  if (imageArrayKey) {
    body[imageArrayKey] = context.imageUrls;
  } else {
    const imageSingleKey = findPropertyName(names, IMAGE_SINGLE_KEYS);
    if (imageSingleKey) {
      body[imageSingleKey] = context.imageUrls[0];
    }
  }

  const numImagesKey = findPropertyName(names, NUM_IMAGES_KEYS);
  if (numImagesKey) {
    const prop = schema.properties?.[numImagesKey];
    let numImages = context.numImages;
    if (prop?.maximum != null) {
      numImages = Math.min(numImages, prop.maximum);
    }
    if (prop?.enum?.length) {
      const allowed = prop.enum.filter((value): value is number => typeof value === "number");
      if (allowed.length > 0) {
        numImages = allowed.includes(context.numImages)
          ? context.numImages
          : allowed.reduce((closest, value) =>
              Math.abs(value - context.numImages) < Math.abs(closest - context.numImages)
                ? value
                : closest,
            allowed[0]!);
      }
    }
    body[numImagesKey] = numImages;
  }

  const aspectKey = findPropertyName(names, ASPECT_KEYS);
  if (aspectKey) {
    body[aspectKey] = context.outputSettings.imageAspectRatio;
  }

  const resolutionKey = findPropertyName(names, RESOLUTION_KEYS);
  if (resolutionKey) {
    const prop = schema.properties?.[resolutionKey];
    const resolution = context.outputSettings.imageResolution;
    if (prop?.enum?.length) {
      const match = prop.enum.find(
        (value) => typeof value === "string" && value.toLowerCase() === resolution,
      );
      body[resolutionKey] = match ?? prop.enum[0];
    } else {
      body[resolutionKey] = resolution;
    }
  }

  for (const [propertyName, property] of Object.entries(schema.properties)) {
    if (body[propertyName] !== undefined) continue;
    if (propertyName === "enable_sync_mode") {
      assignIfPresent(body, propertyName, false);
      continue;
    }
    if (propertyName === "enable_base64_output") {
      assignIfPresent(body, propertyName, false);
      continue;
    }
    if (propertyName === "output_format" && property.enum?.includes("png")) {
      assignIfPresent(body, propertyName, "png");
      continue;
    }
    const fallback = defaultForProperty(property);
    if (fallback !== undefined) {
      body[propertyName] = fallback;
    }
  }

  for (const requiredField of schema.required ?? []) {
    if (body[requiredField] === undefined || body[requiredField] === null) {
      throw new Error(`Schema field "${requiredField}" is required for ${model.model_id}`);
    }
  }

  return body;
}

export function buildVideoRequestFromSchema(
  model: WaveSpeedCatalogModel,
  context: AmveVideoRequestContext,
): Record<string, unknown> {
  const schema = extractRequestSchema(model);
  if (!schema?.properties) {
    throw new Error(`Model ${model.model_id} has no request schema`);
  }

  const names = schemaPropertyNames(schema);
  const body: Record<string, unknown> = {};

  const promptKey = findPropertyName(names, PROMPT_KEYS);
  if (promptKey) {
    body[promptKey] = context.prompt;
  }

  const imageKey = findPropertyName(names, IMAGE_SINGLE_KEYS);
  if (imageKey) {
    body[imageKey] = context.generatedImageUrl;
  }

  const videoKey = findPropertyName(names, VIDEO_KEYS);
  if (videoKey) {
    body[videoKey] = context.sourceMp4Url;
  }

  const orientationKey = findPropertyName(names, MOTION_ORIENTATION_KEYS);
  if (orientationKey) {
    const prop = schema.properties?.[orientationKey];
    if (prop?.enum?.includes("video")) {
      body[orientationKey] = "video";
    } else {
      body[orientationKey] = defaultForProperty(prop!) ?? "video";
    }
  }

  const keepSoundKey = findPropertyName(names, KEEP_SOUND_KEYS);
  if (keepSoundKey) {
    body[keepSoundKey] = true;
  }

  for (const [propertyName, property] of Object.entries(schema.properties)) {
    if (body[propertyName] !== undefined) continue;
    const fallback = defaultForProperty(property);
    if (fallback !== undefined) {
      body[propertyName] = fallback;
    }
  }

  for (const requiredField of schema.required ?? []) {
    if (body[requiredField] === undefined || body[requiredField] === null) {
      throw new Error(`Schema field "${requiredField}" is required for ${model.model_id}`);
    }
  }

  return body;
}

export function planSchemaImageCandidateBatches(
  model: WaveSpeedCatalogModel,
  candidateCount: number,
): number[] {
  const schema = extractRequestSchema(model);
  const names = schemaPropertyNames(schema);
  const numImagesKey = findPropertyName(names, NUM_IMAGES_KEYS);

  if (!numImagesKey) {
    return [candidateCount];
  }

  const prop = schema?.properties?.[numImagesKey];
  const max =
    typeof prop?.maximum === "number"
      ? prop.maximum
      : prop?.enum?.filter((value): value is number => typeof value === "number").sort(
          (a, b) => b - a,
        )[0];

  if (!max || max <= 0) {
    return [candidateCount];
  }

  if (max === 1) {
    return Array.from({ length: candidateCount }, () => 1);
  }

  const batches: number[] = [];
  let remaining = candidateCount;
  while (remaining > 0) {
    const batch = Math.min(max, remaining);
    batches.push(batch);
    remaining -= batch;
  }
  return batches;
}
