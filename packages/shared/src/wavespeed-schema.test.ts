import { describe, expect, it } from "vitest";
import {
  assessSchemaCompatibility,
  buildImageRequestFromSchema,
  buildVideoRequestFromSchema,
  planSchemaImageCandidateBatches,
  type WaveSpeedCatalogModel,
} from "./wavespeed-schema";
import { DEFAULT_OUTPUT_SETTINGS } from "./output-settings";

const NB2_MODEL: WaveSpeedCatalogModel = {
  model_id: "google/nano-banana-2/edit",
  name: "Nano Banana 2 Edit",
  type: "image-editing",
  api_schemas: [
    {
      type: "model_run",
      request_schema: {
        required: ["prompt", "images"],
        properties: {
          prompt: { type: "string" },
          images: { type: "array", items: { type: "string" } },
          aspect_ratio: { type: "string", enum: ["9:16", "2:3"] },
          resolution: { type: "string", enum: ["1k", "2k"] },
          enable_sync_mode: { type: "boolean", default: false },
        },
      },
    },
  ],
};

const KLING_MODEL: WaveSpeedCatalogModel = {
  model_id: "kwaivgi/kling-v3.0-std/motion-control",
  name: "Kling Motion Control",
  type: "motion-control",
  api_schemas: [
    {
      type: "model_run",
      request_schema: {
        required: ["prompt", "image", "video"],
        properties: {
          prompt: { type: "string" },
          image: { type: "string" },
          video: { type: "string" },
          character_orientation: { type: "string", enum: ["video", "image"] },
          keep_original_sound: { type: "boolean", default: true },
        },
      },
    },
  ],
};

const T2V_MODEL: WaveSpeedCatalogModel = {
  model_id: "alibaba/wan-2.7/text-to-video",
  name: "Wan T2V",
  type: "text-to-video",
  api_schemas: [
    {
      type: "model_run",
      request_schema: {
        required: ["prompt"],
        properties: {
          prompt: { type: "string" },
          size: { type: "string", enum: ["1280*720"] },
        },
      },
    },
  ],
};

describe("assessSchemaCompatibility", () => {
  it("marks multi-image edit models as supported", () => {
    expect(assessSchemaCompatibility(NB2_MODEL, "image_gen").level).toBe("supported");
  });

  it("marks motion-control video models as supported", () => {
    expect(assessSchemaCompatibility(KLING_MODEL, "video_gen").level).toBe("supported");
  });

  it("marks text-to-video without image input as unsupported", () => {
    expect(assessSchemaCompatibility(T2V_MODEL, "video_gen").level).toBe("unsupported");
  });
});

describe("buildImageRequestFromSchema", () => {
  it("maps CrossPost image context to schema fields", () => {
    const body = buildImageRequestFromSchema(NB2_MODEL, {
      prompt: "swap face",
      imageUrls: ["a", "b", "c", "d", "e"],
      labeledInputs: [],
      outputSettings: DEFAULT_OUTPUT_SETTINGS,
      numImages: 1,
    });

    expect(body).toMatchObject({
      prompt: "swap face",
      images: ["a", "b", "c", "d", "e"],
      aspect_ratio: "2:3",
      resolution: "1k",
      enable_sync_mode: false,
    });
  });
});

describe("buildVideoRequestFromSchema", () => {
  it("maps CrossPost video context to motion-control schema", () => {
    const body = buildVideoRequestFromSchema(KLING_MODEL, {
      prompt: "motion",
      generatedImageUrl: "https://img.test/out.png",
      sourceMp4Url: "https://video.test/reel.mp4",
    });

    expect(body).toMatchObject({
      prompt: "motion",
      image: "https://img.test/out.png",
      video: "https://video.test/reel.mp4",
      character_orientation: "video",
      keep_original_sound: true,
    });
  });
});

describe("planSchemaImageCandidateBatches", () => {
  it("splits batches when schema limits num_images", () => {
    const model: WaveSpeedCatalogModel = {
      ...NB2_MODEL,
      api_schemas: [
        {
          type: "model_run",
          request_schema: {
            properties: {
              prompt: { type: "string" },
              images: { type: "array" },
              num_images: { type: "integer", maximum: 2 },
            },
          },
        },
      ],
    };

    expect(planSchemaImageCandidateBatches(model, 4)).toEqual([2, 2]);
  });
});
