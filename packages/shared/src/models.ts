import { z } from "zod";

export const createModelSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  displayName: z.string().min(1),
  notes: z.string().optional(),
});

export const updateModelSchema = z.object({
  displayName: z.string().min(1).optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
  notes: z.string().optional(),
});

export type CreateModelRequest = z.infer<typeof createModelSchema>;
export type UpdateModelRequest = z.infer<typeof updateModelSchema>;
