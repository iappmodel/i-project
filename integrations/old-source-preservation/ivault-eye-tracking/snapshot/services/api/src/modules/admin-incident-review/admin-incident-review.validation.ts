import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const incidentReviewQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum(["open", "assigned", "investigating", "closed", "dismissed", "overdue"])
    .optional(),
  severity: z.enum(["high", "critical"]).optional()
});

export const incidentReviewIdParamSchema = z.object({
  id: uuidSchema
});

export const assignIncidentReviewSchema = z.object({
  assignedToAuthUserId: uuidSchema,
  note: z.string().min(1).max(2048).optional(),
  metadata: boundedMetadataSchema
});

export const startIncidentReviewSchema = z.object({
  note: z.string().min(1).max(2048).optional(),
  metadata: boundedMetadataSchema
});

export const closeIncidentReviewSchema = z.object({
  closureReason: z.string().min(1).max(2048),
  findings: z.string().min(1).max(10_000),
  correctiveActions: z.string().min(1).max(10_000),
  metadata: boundedMetadataSchema
});

export const dismissIncidentReviewSchema = z.object({
  dismissalReason: z.string().min(1).max(2048),
  metadata: boundedMetadataSchema
});
