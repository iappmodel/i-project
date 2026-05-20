import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const downloadQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  artifactType: z.string().min(1).max(128).optional()
});

export const createDownloadGrantSchema = z.object({
  downloadSubjectId: uuidSchema,
  grantScope: z.enum([
    "public",
    "customer",
    "private_room",
    "auditor_portal",
    "enterprise_review_room",
    "admin",
    "worker",
    "system"
  ]),
  grantedToAuthUserId: uuidSchema.optional(),
  grantedToEmail: z.string().email().optional(),
  grantedToDisplayName: z.string().max(256).optional(),
  grantedToParticipantId: uuidSchema.optional(),
  privateRoomId: uuidSchema.optional(),
  privateRoomParticipantId: uuidSchema.optional(),
  auditorPortalId: uuidSchema.optional(),
  auditorParticipantId: uuidSchema.optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  maxDownloads: z.number().int().min(1).max(100).default(3),
  expiresInMinutes: z.number().int().min(1).max(1440).default(15),
  userAgentHint: z.string().max(512).optional(),
  metadata: boundedMetadataSchema
});

export const revokeDownloadGrantSchema = z.object({
  reason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
