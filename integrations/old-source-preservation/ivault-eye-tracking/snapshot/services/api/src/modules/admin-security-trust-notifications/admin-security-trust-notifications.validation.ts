import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const trustNotificationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  topicType: z.string().min(1).max(128).optional()
});

export const createSubscriberSchema = z.object({
  subscriberType: z.enum([
    "customer_admin",
    "customer_security",
    "auditor",
    "regulator",
    "internal_observer",
    "public_trust_subscriber",
    "other"
  ]),
  email: z.string().email(),
  displayName: z.string().max(256).optional(),
  authUserId: uuidSchema.optional(),
  organizationName: z.string().max(256).optional(),
  organizationDomain: z.string().max(256).optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  auditorPortalId: uuidSchema.optional(),
  participantId: uuidSchema.optional(),
  preferredChannel: z.enum(["email", "webhook", "in_app", "digest_only"]).default("email"),
  metadata: boundedMetadataSchema
});

export const createNotificationEventSchema = z.object({
  topicKey: z.string().min(1).max(128),
  eventType: z.string().min(1).max(128),
  eventSeverity: z.enum(["info", "notice", "warning", "critical"]).default("info"),
  visibility: z
    .enum(["public", "customer_scoped", "room_scoped", "auditor_scoped", "admin_only"])
    .default("customer_scoped"),
  sourceType: z.string().min(1).max(128),
  sourceId: uuidSchema,
  sourceArtifactKey: z.string().max(512).optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  auditorPortalId: uuidSchema.optional(),
  title: z.string().min(1).max(256),
  summary: z.string().min(1).max(5000),
  bodyMarkdown: z.string().max(20000).optional(),
  actionUrl: z.string().max(2048).optional(),
  publicSafe: z.boolean().default(true),
  metadata: boundedMetadataSchema
});

export const fanoutEventSchema = z.object({
  notificationEventId: uuidSchema,
  metadata: boundedMetadataSchema
});

export const runFanoutSchema = z.object({
  batchSize: z.number().int().min(1).max(500).default(100),
  metadata: boundedMetadataSchema
});

export const runExpiryWarningsSchema = z.object({
  daysBefore: z.number().int().min(1).max(180).default(14),
  batchSize: z.number().int().min(1).max(5000).default(500),
  metadata: boundedMetadataSchema
});

export const syncRoomSubscribersSchema = z.object({
  enterpriseReviewRoomId: uuidSchema,
  metadata: boundedMetadataSchema
});

export const syncAuditorSubscribersSchema = z.object({
  auditorPortalId: uuidSchema,
  metadata: boundedMetadataSchema
});
