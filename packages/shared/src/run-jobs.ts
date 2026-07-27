import { z } from "zod";

export const retryRunJobSchema = z.object({
  id: z.number().int().positive(),
  requestedBy: z.string().min(1).optional(),
});

export type RetryRunJobRequest = z.infer<typeof retryRunJobSchema>;

export type ManualRunJobPayload = {
  kind: "manual_run";
  request: Record<string, unknown>;
};
