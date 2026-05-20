import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const policyChangeQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z
    .enum([
      "draft",
      "submitted",
      "approved",
      "rejected",
      "activated",
      "superseded",
      "archived",
      "cancelled"
    ])
    .optional(),

  changeType: z
    .enum(["create_policy", "update_policy", "supersede_policy", "archive_policy"])
    .optional()
});

export const createPolicyChangeSchema = z.object({
  changeType: z.enum(["create_policy", "update_policy", "supersede_policy", "archive_policy"]),
  changeKey: z.string().min(1).max(256),
  title: z.string().min(1).max(256),
  rationale: z.string().min(1).max(5000),

  targetPolicyId: uuidSchema.optional(),

  policyKey: z.string().min(1).max(256).optional(),
  policyName: z.string().min(1).max(256).optional(),
  category: z
    .enum([
      "mfa",
      "break_glass",
      "incident_review",
      "corrective_action",
      "notification",
      "retention",
      "archive",
      "verification",
      "deletion",
      "legal_hold",
      "audit",
      "session",
      "device",
      "general"
    ])
    .optional(),

  severity: z.enum(["medium", "high", "critical"]).optional(),
  ownerTeam: z.string().min(1).max(128).optional(),
  description: z.string().min(1).max(5000).optional(),

  riskLevel: z.enum(["medium", "high", "critical"]).default("high"),

  metadata: boundedMetadataSchema
});

export const submitPolicyChangeSchema = z.object({
  note: z.string().min(1).max(2048).optional(),
  metadata: boundedMetadataSchema
});

export const reviewPolicyChangeSchema = z.object({
  reviewStatus: z.enum(["commented", "approved", "rejected", "requested_changes"]),
  reviewNote: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const approvePolicyChangeSchema = z.object({
  approvalNote: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const rejectPolicyChangeSchema = z.object({
  rejectionReason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const activatePolicyChangeSchema = z.object({
  activationNote: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const cancelPolicyChangeSchema = z.object({
  cancelReason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const policyChangeIdParamSchema = z.object({
  id: uuidSchema
});

export const runPolicySimulationSchema = z.object({
  metadata: boundedMetadataSchema
});

export const policySimulationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.enum(["running", "passed", "warning", "failed", "error"]).optional(),

  policyChangeRequestId: uuidSchema.optional()
});

export const policySimulationItemQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 100))
    .pipe(z.number().int().min(1).max(250)),

  simulationRunId: uuidSchema.optional(),

  resultStatus: z.enum(["pass", "warn", "fail", "blocked", "not_applicable"]).optional()
});
