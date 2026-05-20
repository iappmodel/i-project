import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const notificationChannelQuerySchema = z.object({
  status: z.enum(["active", "paused", "archived"]).optional(),
  channelType: z.enum(["slack", "email", "webhook", "siem_stub"]).optional()
});

export const updateNotificationChannelSchema = z.object({
  status: z.enum(["active", "paused", "archived"]).optional(),
  displayName: z.string().min(1).max(256).optional(),
  destination: z.string().min(1).max(2048).optional(),
  secretRef: z.string().min(1).max(256).optional(),
  minSeverity: z.enum(["medium", "high", "critical"]).optional(),
  metadata: boundedMetadataSchema
});

export const notificationDeliveryQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum(["pending", "sending", "sent", "failed", "abandoned", "skipped"])
    .optional()
});

export const notificationChannelIdParamSchema = z.object({
  id: uuidSchema
});
