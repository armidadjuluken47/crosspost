import { describe, expect, it } from "vitest";
import {
  buildLabeledImageInputs,
  DEFAULT_IMAGE_INPUT_SLOTS,
  imageUrlsFromLabeledInputs,
  parseLabeledInputsFromStagePayload,
} from "./image-input-roles";

describe("buildLabeledImageInputs", () => {
  it("orders face refs then duplicates first frame as body and scenery", () => {
    const labeled = buildLabeledImageInputs({
      referenceImageUrls: ["https://example.com/f1.jpg", "https://example.com/f2.jpg", "https://example.com/f3.jpg"],
      sourceFirstFrameUrl: "https://example.com/frame.jpg",
    });

    expect(labeled).toHaveLength(5);
    expect(labeled.map((row) => row.role)).toEqual(["face", "face", "face", "body", "scenery"]);
    expect(imageUrlsFromLabeledInputs(labeled)).toEqual([
      "https://example.com/f1.jpg",
      "https://example.com/f2.jpg",
      "https://example.com/f3.jpg",
      "https://example.com/frame.jpg",
      "https://example.com/frame.jpg",
    ]);
  });

  it("uses default slot definitions", () => {
    expect(DEFAULT_IMAGE_INPUT_SLOTS).toHaveLength(5);
    expect(DEFAULT_IMAGE_INPUT_SLOTS[4]?.label).toBe("Scenery");
  });
});

describe("parseLabeledInputsFromStagePayload", () => {
  const labeledInputs = DEFAULT_IMAGE_INPUT_SLOTS;

  it("reads labeled_inputs from a flat payload", () => {
    expect(
      parseLabeledInputsFromStagePayload({
        labeled_inputs: labeledInputs,
        num_images: 2,
      }),
    ).toHaveLength(5);
  });

  it("reads labeled_inputs from batched Nano Banana payloads", () => {
    const parsed = parseLabeledInputsFromStagePayload({
      batches: [{ labeled_inputs: labeledInputs, num_images: 2 }],
    });

    expect(parsed).toHaveLength(5);
    expect(parsed[4]?.label).toBe("Scenery");
  });
});
