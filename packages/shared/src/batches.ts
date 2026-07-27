import { z } from "zod";

export const createBatchSchema = z.object({
  name: z.string().min(1).optional(),
  modelIds: z.array(z.number().int().positive()).min(1),
  sourceReelIds: z.array(z.number().int().positive()).min(1),
  operatorInstruction: z.string().optional(),
  requestedBy: z.string().optional(),
});

export type CreateBatchRequest = z.infer<typeof createBatchSchema>;

export const ESTIMATED_RUN_COST_CENTS = {
  fixture: 61,
  live: 75,
} as const;

export function estimateBatchCostCents(runCount: number, mode: "fixture" | "live") {
  return runCount * ESTIMATED_RUN_COST_CENTS[mode];
}
