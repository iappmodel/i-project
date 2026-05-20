import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const trustTimelineQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  eventFamily: z.string().min(1).max(64).optional(),
  eventType: z.string().min(1).max(128).optional(),
  riskLevel: z.string().min(1).max(64).optional(),
  privateRoomId: uuidSchema.optional(),
  customerName: z.string().max(256).optional()
});

export const createTimelineSnapshotSchema = z.object({
  snapshotScope: z.enum([
    "public",
    "customer",
    "private_room",
    "auditor_portal",
    "enterprise_review_room",
    "admin"
  ]),
  title: z.string().min(1).max(512),
  summary: z.string().max(2000).optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional(),
  auditorPortalId: uuidSchema.optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  metadata: boundedMetadataSchema
});

export const buildTimelineSnapshotSchema = z.object({
  snapshotId: uuidSchema,
  metadata: boundedMetadataSchema
});
