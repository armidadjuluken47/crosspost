import { describe, expect, it } from "vitest";
import {
  isNanoBananaEditMulti,
  isNanoBanana2Edit,
  planImageCandidateBatches,
  planNanoBananaEditMultiBatches,
} from "./nano-banana-batches";

describe("planNanoBananaEditMultiBatches", () => {
  it("uses two API calls to reach four candidates", () => {
    expect(planNanoBananaEditMultiBatches(4)).toEqual([2, 2]);
  });

  it("uses one API call for two candidates", () => {
    expect(planNanoBananaEditMultiBatches(2)).toEqual([2]);
  });

  it("rounds up odd counts with an extra batch", () => {
    expect(planNanoBananaEditMultiBatches(3)).toEqual([2, 2]);
  });
});

describe("planImageCandidateBatches", () => {
  it("uses four single-output calls for Nano Banana 2 edit", () => {
    expect(planImageCandidateBatches("google/nano-banana-2/edit", 4)).toEqual([1, 1, 1, 1]);
  });
});

describe("isNanoBanana2Edit", () => {
  it("matches the configured WaveSpeed model path", () => {
    expect(isNanoBanana2Edit("google/nano-banana-2/edit")).toBe(true);
    expect(isNanoBanana2Edit("google/nano-banana-pro/edit-multi")).toBe(false);
  });
});
