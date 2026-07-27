import { describe, expect, it } from "vitest";
import { renderPromptTemplate } from "./render";

describe("renderPromptTemplate", () => {
  it("replaces prompt variables and appends operator instruction", () => {
    const rendered = renderPromptTemplate(
      "Model {{model_display_name}} reel {{source_reel_shortcode}} {{run_instruction_block}}",
      {
        modelSlug: "hazel",
        modelDisplayName: "Hazel",
        sourceReelShortcode: "demo-1",
        sourceReelUrl: "https://www.instagram.com/reel/demo-1/",
        operatorInstruction: "Keep the jacket texture crisp.",
      },
    );

    expect(rendered).toContain("Hazel");
    expect(rendered).toContain("demo-1");
    expect(rendered).toContain("Keep the jacket texture crisp.");
  });
});
