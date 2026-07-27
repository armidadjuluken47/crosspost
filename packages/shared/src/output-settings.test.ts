import { describe, expect, it } from "vitest";
import { parseOutputSettings } from "./output-settings";

describe("parseOutputSettings", () => {
  it("applies defaults for partial payloads", () => {
    expect(parseOutputSettings({ imageAspectRatio: "9:16" })).toEqual({
      imageAspectRatio: "9:16",
      imageResolution: "1k",
      normalizeWidth: 1080,
      normalizeHeight: 1920,
    });
  });
});
