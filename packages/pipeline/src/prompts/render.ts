export interface PromptRenderContext {
  modelSlug: string;
  modelDisplayName: string;
  sourceReelShortcode: string;
  sourceReelUrl: string;
  operatorInstruction?: string;
}

export function renderPromptTemplate(body: string, context: PromptRenderContext): string {
  const instructionBlock = context.operatorInstruction?.trim()
    ? `\nOperator instruction:\n${context.operatorInstruction.trim()}`
    : "";

  return body
    .replaceAll("{{model_slug}}", context.modelSlug)
    .replaceAll("{{model_display_name}}", context.modelDisplayName)
    .replaceAll("{{source_reel_shortcode}}", context.sourceReelShortcode)
    .replaceAll("{{source_reel_url}}", context.sourceReelUrl)
    .replaceAll("{{run_instruction_block}}", instructionBlock);
}
