import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const correctiveActionQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum(["open", "assigned", "in_progress", "completed", "dismissed", "overdue"])
    .optional(),
  priority: z.enum(["medium", "high", "critical"]).optional(),
  incidentReviewId: uuidSchema.optional()
});

export const correctiveActionIdParamSchema = z.object({
  id: uuidSchema
});

export const createCorrectiveActionSchema = z.object({
  incidentReviewId: uuidSchema,
  actionKey: z.string().min(1).max(128),
  priority: z.enum(["medium", "high", "critical"]).default("high"),
  title: z.string().min(1).max(256),
  description: z.string().min(1).max(5000),
  assignedToAuthUserId: uuidSchema.optional(),
  dueAt: z.string().datetime().optional(),
  metadata: boundedMetadataSchema
});

export const assignCorrectiveActionSchema = z.object({
  assignedToAuthUserId: uuidSchema,
  note: z.string().min(1).max(2048).optional(),
  metadata: boundedMetadataSchema
});

export const startCorrectiveActionSchema = z.object({
  note: z.string().min(1).max(2048).optional(),
  metadata: boundedMetadataSchema
});

export const completeCorrectiveActionSchema = z.object({
  completionNote: z.string().min(1).max(5000),
  evidenceUrl: z.string().url().max(2048).optional(),
  metadata: boundedMetadataSchema
});

export const dismissCorrectiveActionSchema = z.object({
  dismissalReason: z.string().min(1).max(2048),
  metadata: boundedMetadataSchema
});
