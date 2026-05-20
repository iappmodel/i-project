import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const createBreakGlassRequestSchema = z.object({
  targetAdminAuthUserId: uuidSchema,
  reason: z.string().min(1).max(2048),
  metadata: boundedMetadataSchema
});

export const breakGlassRequestIdParamSchema = z.object({
  id: uuidSchema
});

export const approveBreakGlassRequestSchema = z.object({
  reason: z.string().min(1).max(2048),
  metadata: boundedMetadataSchema
});

export const rejectBreakGlassRequestSchema = z.object({
  rejectionReason: z.string().min(1).max(2048),
  metadata: boundedMetadataSchema
});

export const executeBreakGlassRequestSchema = z.object({
  token: z.string().min(32).max(256),
  metadata: boundedMetadataSchema
});

export const breakGlassQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum(["pending", "approved", "rejected", "executed", "expired", "revoked"])
    .optional()
});
