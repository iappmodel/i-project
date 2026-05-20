import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const artifactSearchQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  artifactType: z.string().min(1).max(128).optional()
});

export const createSearchSessionSchema = z.object({
  searchScope: z.enum([
    "public",
    "customer",
    "private_room",
    "auditor_portal",
    "enterprise_review_room",
    "admin"
  ]),
  requesterAuthUserId: uuidSchema.optional(),
  requesterEmail: z.string().email().optional(),
  requesterDisplayName: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional(),
  privateRoomParticipantId: uuidSchema.optional(),
  auditorPortalId: uuidSchema.optional(),
  auditorParticipantId: uuidSchema.optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  expiresInMinutes: z.number().int().min(1).max(1440).default(60),
  maxQueries: z.number().int().min(1).max(10000).default(100),
  metadata: boundedMetadataSchema
});

export const executeSearchSchema = z.object({
  searchToken: z.string().min(32).max(256),
  queryText: z.string().min(1).max(1000),
  queryType: z.enum(["keyword", "semantic", "hybrid", "filter_only"]).default("keyword"),
  limit: z.number().int().min(1).max(100).default(20),
  metadata: boundedMetadataSchema
});

export const registerSearchDocumentSchema = z.object({
  viewerSubjectId: uuidSchema,
  metadata: boundedMetadataSchema
});
