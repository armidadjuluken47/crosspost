export function renderPromptPreview(
  body: string,
  input: {
    modelDisplayName: string;
    sourceReelShortcode: string;
    operatorInstruction?: string;
  },
) {
  const instructionBlock = input.operatorInstruction?.trim()
    ? `\nOperator instruction:\n${input.operatorInstruction.trim()}`
    : "";

  return body
    .replaceAll("{{model_display_name}}", input.modelDisplayName)
    .replaceAll("{{source_reel_shortcode}}", input.sourceReelShortcode)
    .replaceAll("{{run_instruction_block}}", instructionBlock);
}
