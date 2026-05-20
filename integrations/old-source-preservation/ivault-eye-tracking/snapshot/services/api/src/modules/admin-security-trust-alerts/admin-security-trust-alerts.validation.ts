import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const trustAlertQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.string().min(1).max(64).optional(),
  severity: z.string().max(64).optional(),
  alertPriority: z.string().max(64).optional(),
  sourceModule: z.string().max(128).optional(),
  customerName: z.string().max(256).optional(),
  channelType: z.string().max(64).optional()
});

export const createAlertEventSchema = z.object({
  sourceModule: z.enum([
    "command_center",
    "incidents",
    "ai_analyst",
    "risk_scores",
    "verification",
    "proofs",
    "transparency",
    "billing",
    "integrations",
    "system",
    "manual"
  ]),
  sourceEventType: z.string().min(1).max(256),
  severity: z.enum(["info", "low", "medium", "high", "critical"]).default("medium"),
  alertPriority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  title: z.string().min(1).max(512),
  summary: z.string().min(1).max(4000),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  sourceTable: z.string().max(256).optional(),
  sourceId: uuidSchema.optional(),
  sourceKey: z.string().max(2048).optional(),
  dedupeKey: z.string().max(2048).optional(),
  alertPayload: z.record(z.string(), z.unknown()).default({}),
  metadata: boundedMetadataSchema
});

export const notificationResultSchema = z.object({
  success: z.boolean(),
  responseStatus: z.number().int().optional(),
  responseBodyPreview: z.string().max(2000).optional(),
  errorCode: z.string().max(128).optional(),
  errorMessage: z.string().max(2000).optional(),
  durationMs: z.number().int().min(0).optional(),
  metadata: boundedMetadataSchema
});

export const resolveAlertEventSchema = z.object({
  resolutionNote: z.string().min(1).max(4000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
