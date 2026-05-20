import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const enrollTotpSchema = z.object({
  label: z.string().min(1).max(128).optional(),
  metadata: boundedMetadataSchema
});

export const confirmTotpEnrollmentSchema = z.object({
  factorId: uuidSchema,
  code: z.string().regex(/^[0-9]{6}$/),
  metadata: boundedMetadataSchema
});

export const verifyTotpChallengeSchema = z.object({
  challengeId: uuidSchema,
  code: z.string().regex(/^[0-9]{6}$/),
  metadata: boundedMetadataSchema
});

export const mfaFactorIdParamSchema = z.object({
  factorId: uuidSchema
});

export const mfaFactorActionSchema = z.object({
  reason: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});

export const generateRecoveryCodesSchema = z.object({
  count: z.number().int().min(1).max(20).default(10),
  metadata: boundedMetadataSchema
});

export const verifyRecoveryCodeChallengeSchema = z.object({
  challengeId: uuidSchema,
  code: z.string().min(8).max(32),
  metadata: boundedMetadataSchema
});

export const revokeRecoveryCodesSchema = z.object({
  reason: z.string().min(1).max(1024),
  metadata: boundedMetadataSchema
});
