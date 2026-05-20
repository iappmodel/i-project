import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const retentionQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.string().min(1).max(64).optional(),
  sourceType: z.string().min(1).max(128).optional()
});

export const registerRetentionSubjectSchema = z.object({
  sourceType: z.string().min(1).max(128),
  sourceId: uuidSchema,
  subjectTitle: z.string().min(1).max(256),
  subjectSummary: z.string().max(5000).optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  artifactKey: z.string().max(512).optional(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  signature: z.string().max(2048).optional(),
  firstSeenAt: z.string().datetime().optional(),
  metadata: boundedMetadataSchema
});

export const placeLegalHoldSchema = z.object({
  sourceType: z.string().min(1).max(128),
  sourceId: uuidSchema,
  holdType: z
    .enum([
      "legal",
      "security_incident",
      "customer_dispute",
      "regulatory",
      "litigation",
      "internal_investigation",
      "other"
    ])
    .default("legal"),
  title: z.string().min(1).max(256),
  reason: z.string().min(1).max(5000),
  caseReference: z.string().max(512).optional(),
  externalReference: z.string().max(512).optional(),
  metadata: boundedMetadataSchema
});

export const releaseLegalHoldSchema = z.object({
  releaseReason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const executeRetentionDeletionSchema = z.object({
  reason: z.string().min(1).max(5000),
  secondAdminApprovalRequestId: uuidSchema.optional(),
  metadata: boundedMetadataSchema
});

export const runRetentionJobSchema = z.object({
  batchSize: z.number().int().min(1).max(5000).default(1000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
