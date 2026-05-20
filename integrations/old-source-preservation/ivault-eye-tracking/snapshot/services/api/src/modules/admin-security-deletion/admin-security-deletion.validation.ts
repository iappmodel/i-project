import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const deletionRequestQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum([
      "pending",
      "approved",
      "rejected",
      "executing",
      "executed",
      "failed",
      "cancelled"
    ])
    .optional(),
  sourceType: z.string().min(1).max(128).optional()
});

export const createDeletionRequestSchema = z.object({
  sourceType: z.string().min(1).max(128),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  reason: z.string().min(1).max(2048),
  metadata: boundedMetadataSchema
});

export const approveDeletionRequestSchema = z.object({
  approvalReason: z.string().min(1).max(2048),
  metadata: boundedMetadataSchema
});

export const rejectDeletionRequestSchema = z.object({
  rejectionReason: z.string().min(1).max(2048),
  metadata: boundedMetadataSchema
});

export const executeDeletionRequestSchema = z.object({
  metadata: boundedMetadataSchema
});

export const deletionRequestIdParamSchema = z.object({
  id: uuidSchema
});
