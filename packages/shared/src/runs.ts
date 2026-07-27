import { z } from "zod";

export const manualRunRequestSchema = z.object({
  sourceAccount: z.object({
    handle: z.string().min(1),
    followerCount: z.number().int().nonnegative().optional(),
  }),
  sourceReel: z.object({
    shortcode: z.string().min(1),
    reelUrl: z.string().url(),
    postedAt: z.string().datetime().optional(),
    caption: z.string().optional(),
    viewCount: z.number().int().nonnegative().optional(),
    durationSeconds: z.number().int().positive().optional(),
    firstFrameR2Key: z.string().optional(),
    mp4R2Key: z.string().optional(),
  }),
  model: z.object({
    slug: z.string().min(1),
    displayName: z.string().min(1),
  }),
  prompt: z.string().optional(),
  executionMode: z.enum(["inline", "queued"]).optional(),
});

export type ManualRunRequest = z.infer<typeof manualRunRequestSchema>;
