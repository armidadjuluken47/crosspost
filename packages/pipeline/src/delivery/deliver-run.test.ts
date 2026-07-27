import { describe, expect, it } from "vitest";
import { buildDriveDeliveryPaths } from "./deliver-run";

describe("buildDriveDeliveryPaths", () => {
  it("uses a flat model folder and shortcode-prefixed filename", () => {
    expect(
      buildDriveDeliveryPaths({
        runId: 42,
        modelSlug: "hazel",
        sourceShortcode: "DZgrCBLtv5_",
      }),
    ).toEqual({
      fileName: "DZgrCBLtv5_-run-42-final.mp4",
      folderPath: "hazel",
      drivePath: "hazel/DZgrCBLtv5_-run-42-final.mp4",
    });
  });
});
