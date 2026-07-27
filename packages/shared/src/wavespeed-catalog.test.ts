import { describe, expect, it } from "vitest";
import {
  buildCustomProviderId,
  catalogModelMatchesStage,
  filterCatalogForStage,
  inferCrossPostCompatibility,
  searchCatalogModels,
  type WaveSpeedCatalogModel,
} from "./wavespeed-catalog";

const SAMPLE: WaveSpeedCatalogModel[] = [
  {
    model_id: "google/nano-banana-2/edit",
    name: "Nano Banana 2 Edit",
    type: "image-editing",
    base_price: 0.05,
  },
  {
    model_id: "kwaivgi/kling-v3.0-std/motion-control",
    name: "Kling v3 Standard Motion Control",
    type: "motion-control",
    base_price: 0.63,
  },
  {
    model_id: "alibaba/wan-2.7/text-to-video",
    name: "Wan 2.7 Text-to-Video",
    type: "text-to-video",
    base_price: 0.4,
  },
];

describe("wavespeed catalog helpers", () => {
  it("filters image and video stages", () => {
    expect(filterCatalogForStage(SAMPLE, "image_gen").map((m) => m.model_id)).toEqual([
      "google/nano-banana-2/edit",
    ]);
    expect(filterCatalogForStage(SAMPLE, "video_gen").map((m) => m.model_id)).toEqual([
      "kwaivgi/kling-v3.0-std/motion-control",
      "alibaba/wan-2.7/text-to-video",
    ]);
  });

  it("searches by model id and name", () => {
    const imageModels = filterCatalogForStage(SAMPLE, "image_gen");
    expect(searchCatalogModels(imageModels, "nano-banana").map((m) => m.model_id)).toEqual([
      "google/nano-banana-2/edit",
    ]);
  });

  it("infers compatibility tiers", () => {
    expect(inferCrossPostCompatibility(SAMPLE[0]!, "image_gen")).toBe("supported");
    expect(inferCrossPostCompatibility(SAMPLE[1]!, "video_gen")).toBe("supported");
    expect(inferCrossPostCompatibility(SAMPLE[2]!, "video_gen")).toBe("experimental");
  });

  it("builds stable custom provider ids", () => {
    expect(buildCustomProviderId("google/nano-banana-2/edit")).toBe(
      "custom_google_nano_banana_2_edit",
    );
  });

  it("matches edit models for image stage", () => {
    expect(catalogModelMatchesStage(SAMPLE[0]!, "image_gen")).toBe(true);
    expect(catalogModelMatchesStage(SAMPLE[0]!, "video_gen")).toBe(false);
  });
});
