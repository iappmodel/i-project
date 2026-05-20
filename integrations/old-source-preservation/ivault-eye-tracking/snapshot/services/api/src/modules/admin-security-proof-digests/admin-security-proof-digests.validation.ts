import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const proofDigestQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  eventType: z.string().min(1).max(128).optional(),
  severity: z.string().min(1).max(64).optional(),
  recipientEmail: z.string().email().optional()
});

export const createAdminDigestSubscriptionSchema = z.object({
  recipientEmail: z.string().email(),
  recipientDisplayName: z.string().max(256).optional(),
  digestFrequency: z
    .enum(["immediate", "hourly", "daily", "weekly", "manual"])
    .default("daily"),
  digestChannel: z
    .enum(["email", "in_app", "webhook", "slack", "system"])
    .default("email"),
  timezone: z.string().min(1).max(128).default("UTC"),
  metadata: boundedMetadataSchema
});

export const recordNotificationEventSchema = z.object({
  eventScope: z.enum([
    "global_admin",
    "customer",
    "private_room",
    "auditor_portal",
    "enterprise_review_room"
  ]),
  eventType: z.string().min(1).max(128),
  severity: z.enum(["info", "notice", "warning", "critical"]).default("info"),
  title: z.string().min(1).max(512),
  summary: z.string().max(2000).optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional(),
  sourceType: z.string().min(1).max(128).default("system"),
  sourceId: uuidSchema.optional(),
  sourceKey: z.string().max(2048).optional(),
  proofType: z.string().max(128).optional(),
  proofKey: z.string().max(2048).optional(),
  proofHashSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  relatedUrl: z.string().url().optional(),
  metadata: boundedMetadataSchema
});
