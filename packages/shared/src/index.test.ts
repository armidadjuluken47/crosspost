import { describe, expect, it } from "vitest";
import { getEnabledProviders } from "./providers";
import { normalizeInstagramHandle, parseInstagramHandlesFromText } from "./keys";

describe("providers", () => {
  it("keeps WaveSpeed image provider order", () => {
    const imageProviders = getEnabledProviders("image_gen");
    expect(imageProviders.map((p) => p.id)).toEqual([
      "wavespeed_nano_banana_2",
      "wavespeed_nano_banana_pro",
      "wavespeed_seedream_v45",
    ]);
  });

  it("keeps Kling Pro disabled", () => {
    const videoProviders = getEnabledProviders("video_gen");
    expect(videoProviders.map((p) => p.id)).toEqual(["wavespeed_kling_v3_standard"]);
  });
});

describe("instagram handles", () => {
  it("parses profile and reels urls", () => {
    const handles = parseInstagramHandlesFromText(
      "https://www.instagram.com/mariedeeonline/reels/\n@hazel\n",
    );
    expect(handles).toContain("mariedeeonline");
    expect(handles).toContain("hazel");
  });

  it("normalizes bare handles", () => {
    expect(normalizeInstagramHandle("@Demo_Model")).toBe("demo_model");
  });
});
