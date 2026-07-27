import { describe, expect, it } from "vitest";
import {
  UNIVERSAL_IMAGE_PROMPT_V2,
  UNIVERSAL_IMAGE_PROMPT_V3,
  UNIVERSAL_VIDEO_PROMPT_V2,
  UNIVERSAL_VIDEO_PROMPT_V3,
} from "./prompt-templates";

describe("universal prompt templates", () => {
  it("does not embed model names in the image template body", () => {
    expect(UNIVERSAL_IMAGE_PROMPT_V2).not.toContain("{{model_display_name}}");
    expect(UNIVERSAL_IMAGE_PROMPT_V2).toContain("images 1–3");
    expect(UNIVERSAL_IMAGE_PROMPT_V2).toContain("image 4");
  });

  it("keeps reel audio in the video template", () => {
    expect(UNIVERSAL_VIDEO_PROMPT_V2).toContain("original reel audio");
    expect(UNIVERSAL_VIDEO_PROMPT_V2).not.toContain("{{model_display_name}}");
  });

  it("v3 removes source captions and requires human identity swap", () => {
    expect(UNIVERSAL_IMAGE_PROMPT_V3).toContain("REMOVE all on-screen text");
    expect(UNIVERSAL_IMAGE_PROMPT_V3).toContain("real human face");
    expect(UNIVERSAL_VIDEO_PROMPT_V3).toContain("Do NOT reproduce source captions");
    expect(UNIVERSAL_VIDEO_PROMPT_V3).toContain("do not drift back");
  });
});
