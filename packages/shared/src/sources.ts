import { z } from "zod";

export const createSourceAccountSchema = z.object({
  handle: z.string().min(1),
  platform: z.enum(["instagram", "tiktok", "youtube"]).optional().default("instagram"),
  notes: z.string().optional(),
});

export const updateSourceAccountSchema = z.object({
  status: z.enum(["active", "paused", "archived"]).optional(),
  notes: z.string().optional(),
});

export const updateSourceReelSchema = z.object({
  status: z.enum([
    "ingested",
    "asset_ready",
    "preview_ready",
    "selected",
    "used",
    "rejected",
    "failed",
    "archived",
  ]),
});

export type CreateSourceAccountRequest = z.infer<typeof createSourceAccountSchema>;
export type UpdateSourceAccountRequest = z.infer<typeof updateSourceAccountSchema>;
export type UpdateSourceReelRequest = z.infer<typeof updateSourceReelSchema>;
