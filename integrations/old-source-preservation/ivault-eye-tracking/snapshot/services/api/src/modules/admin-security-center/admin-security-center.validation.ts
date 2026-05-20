import { z } from "zod";
import { uuidSchema } from "../../shared/validation";

export const securityCenterPriorityQueueQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  itemType: z
    .enum([
      "break_glass",
      "incident_review",
      "corrective_action",
      "security_alert",
      "mfa_gap",
      "admin_device",
      "admin_session"
    ])
    .optional()
});

export const securityCenterTimelineQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 100))
    .pipe(z.number().int().min(1).max(250)),
  eventType: z
    .enum([
      "security_alert",
      "alert_escalation",
      "incident_review",
      "corrective_action",
      "break_glass",
      "admin_session_control",
      "admin_device"
    ])
    .optional(),
  targetAuthUserId: uuidSchema.optional()
});

export const securityActorRollupQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 100))
    .pipe(z.number().int().min(1).max(250)),
  postureStatus: z.enum(["healthy", "warning", "critical"]).optional()
});
