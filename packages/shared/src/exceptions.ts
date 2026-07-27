import { z } from "zod";

export const exceptionStatusSchema = z.enum(["open", "resolved", "dismissed"]);

export const updateExceptionSchema = z.object({
  id: z.number().int().positive(),
  status: exceptionStatusSchema,
  resolvedByUserId: z.string().min(1).optional(),
  resolutionAction: z.string().min(1).optional(),
});

export type UpdateExceptionRequest = z.infer<typeof updateExceptionSchema>;
