import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const legalHoldQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.enum(["active", "released", "expired", "cancelled"]).optional(),

  holdType: z
    .enum(["legal", "compliance", "security", "investigation", "regulatory"])
    .optional()
});

export const createLegalHoldSchema = z.object({
  holdKey: z.string().min(1).max(256),
  holdType: z.enum(["legal", "compliance", "security", "investigation", "regulatory"]),
  title: z.string().min(1).max(256),
  reason: z.string().min(1).max(5000),
  authority: z.string().min(1).max(512).optional(),
  externalReference: z.string().min(1).max(512).optional(),
  effectiveAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: boundedMetadataSchema
});

export const addLegalHoldTargetSchema = z.object({
  targetType: z.enum([
    "source_type",
    "source_record",
    "source_period",
    "admin_user",
    "archive_manifest",
    "global"
  ]),
  sourceType: z.string().min(1).max(128).optional(),
  sourceId: uuidSchema.optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  adminAuthUserId: uuidSchema.optional(),
  archiveManifestId: uuidSchema.optional(),
  metadata: boundedMetadataSchema
});

export const releaseLegalHoldSchema = z.object({
  releaseReason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const legalHoldIdParamSchema = z.object({
  id: uuidSchema
});
