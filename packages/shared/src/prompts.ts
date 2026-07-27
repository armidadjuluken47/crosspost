import { z } from "zod";

export const createPromptSchema = z.object({
  stage: z.enum(["image_gen", "video_gen"]),
  body: z.string().min(1),
  scope: z.enum(["global", "model", "source_account"]).default("global"),
  scopeId: z.number().int().positive().optional(),
  createdBy: z.string().optional(),
});

export type CreatePromptRequest = z.infer<typeof createPromptSchema>;
