import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const proofObservabilityQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  healthStatus: z.string().min(1).max(64).optional(),
  riskLevel: z.string().min(1).max(64).optional(),
  severity: z.string().min(1).max(64).optional(),
  signalType: z.string().min(1).max(128).optional(),
  customerName: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional()
});

export const createProofHealthSignalSchema = z.object({
  signalScope: z
    .enum([
      "global_admin",
      "customer",
      "private_room",
      "auditor_portal",
      "enterprise_review_room"
    ])
    .default("global_admin"),
  signalType: z.enum([
    "verification_failure_rate_high",
    "hash_mismatch_detected",
    "incident_backlog_high",
    "critical_incident_open",
    "unassigned_incident",
    "missing_customer_notice",
    "report_job_failures",
    "qr_job_failures",
    "digest_backlog",
    "link_expiry_risk",
    "download_activity_spike",
    "crypto_integrity_gap",
    "room_inactive",
    "customer_health_degraded",
    "system_healthy",
    "other"
  ]),
  severity: z.enum(["info", "notice", "warning", "critical"]).default("info"),
  title: z.string().min(1).max(512),
  summary: z.string().max(2000).optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional(),
  sourceType: z.string().min(1).max(128).default("manual"),
  sourceId: uuidSchema.optional(),
  sourceKey: z.string().max(2048).optional(),
  metricName: z.string().max(128).optional(),
  metricValue: z.number().optional(),
  proofType: z.string().max(128).optional(),
  proofKey: z.string().max(2048).optional(),
  metadata: boundedMetadataSchema
});

export type CreateProofHealthSignalInput = z.infer<typeof createProofHealthSignalSchema>;
