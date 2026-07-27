import { z } from "zod";

export const registeredIntakeSchema = z.object({
  maxReels: z.number().int().positive().max(20).default(3),
  requestedBy: z.string().optional(),
  handles: z.array(z.string().min(1)).optional(),
});

export const accountIntakeSchema = z.object({
  maxReels: z.number().int().positive().max(20).default(5),
  requestedBy: z.string().optional(),
});

export const fixtureIntakeSchema = z.object({
  sourceAccount: z.object({
    handle: z.string().min(1),
    followerCount: z.number().int().nonnegative().optional(),
  }),
  maxReels: z.number().int().positive().max(10).default(3),
  requestedBy: z.string().optional(),
});

export const importReelSchema = z.object({
  url: z.string().min(1),
  requestedBy: z.string().optional(),
});

export type RegisteredIntakeRequest = z.infer<typeof registeredIntakeSchema>;
export type AccountIntakeRequest = z.infer<typeof accountIntakeSchema>;
export type FixtureIntakeRequest = z.infer<typeof fixtureIntakeSchema>;
export type ImportReelRequest = z.infer<typeof importReelSchema>;
