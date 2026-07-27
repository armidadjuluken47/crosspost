import { describe, expect, it } from "vitest";
import {
  formatImageProviderFailure,
  isWaveSpeedContentBlockMessage,
  summarizeImageProviderChainFailure,
} from "./wavespeed-messages";

describe("isWaveSpeedContentBlockMessage", () => {
  it("detects Google safety rejections", () => {
    expect(
      isWaveSpeedContentBlockMessage(
        "Content flagged as potentially sensitive. Please try different prompts or images.",
      ),
    ).toBe(true);
  });
});

describe("formatImageProviderFailure", () => {
  it("rewrites content blocks for operators", () => {
    expect(
      formatImageProviderFailure(
        "wavespeed_nano_banana_pro",
        "Content flagged as potentially sensitive.",
      ),
    ).toContain("trying the next image model");
  });
});

describe("summarizeImageProviderChainFailure", () => {
  it("mentions safety filters when primary models were blocked", () => {
    const summary = summarizeImageProviderChainFailure([
      "wavespeed_nano_banana_2: Content flagged as potentially sensitive.",
      "wavespeed_nano_banana_pro: Content flagged as potentially sensitive.",
    ]);

    expect(summary).toContain("Google safety filters");
  });
});
