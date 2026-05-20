import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const trustAiAnalystQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.string().min(1).max(64).optional(),
  severity: z.string().min(1).max(64).optional(),
  detectorFamily: z.string().max(128).optional(),
  customerName: z.string().max(256).optional()
});

export const runTrustAiAnalystSchema = z.object({
  detectorFamily: z.string().max(128).optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  metadata: boundedMetadataSchema
});

export const resolveFindingSchema = z.object({
  resolutionNote: z.string().min(1).max(4000),
  metadata: boundedMetadataSchema
});

export const suppressFindingSchema = z.object({
  suppressionReason: z.string().min(1).max(4000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
