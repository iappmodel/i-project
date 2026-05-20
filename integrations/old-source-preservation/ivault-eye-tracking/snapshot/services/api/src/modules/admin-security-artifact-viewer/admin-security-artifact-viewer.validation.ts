import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const artifactViewerQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  artifactType: z.string().min(1).max(128).optional()
});

export const queueViewerRenderSchema = z.object({
  viewerSubjectId: uuidSchema,
  renderMode: z
    .enum([
      "pdf_pages",
      "json_tree",
      "markdown",
      "plain_text",
      "table",
      "manifest",
      "package_summary",
      "metadata_only",
      "unsupported"
    ])
    .optional(),
  metadata: boundedMetadataSchema
});

export const createViewerSessionSchema = z.object({
  viewerSubjectId: uuidSchema,
  viewerScope: z.enum([
    "public",
    "customer",
    "private_room",
    "auditor_portal",
    "enterprise_review_room",
    "admin",
    "system"
  ]),
  requesterAuthUserId: uuidSchema.optional(),
  requesterEmail: z.string().email().optional(),
  requesterDisplayName: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional(),
  privateRoomParticipantId: uuidSchema.optional(),
  auditorPortalId: uuidSchema.optional(),
  auditorParticipantId: uuidSchema.optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  expiresInMinutes: z.number().int().min(1).max(1440).default(30),
  maxPageViews: z.number().int().min(1).max(10000).default(200),
  metadata: boundedMetadataSchema
});
