import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const auditPeriodQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum(["draft", "open", "closed", "sealed", "archived", "cancelled"])
    .optional(),
  auditType: z
    .enum([
      "internal",
      "soc2",
      "iso27001",
      "gdpr",
      "enterprise_review",
      "regulatory",
      "security_review"
    ])
    .optional()
});

export const createAuditPeriodSchema = z.object({
  periodKey: z.string().min(1).max(256),
  periodName: z.string().min(1).max(256),
  auditType: z
    .enum([
      "internal",
      "soc2",
      "iso27001",
      "gdpr",
      "enterprise_review",
      "regulatory",
      "security_review"
    ])
    .default("internal"),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  description: z.string().min(1).max(5000),
  ownerTeam: z.string().min(1).max(128).default("platform"),
  metadata: boundedMetadataSchema
});

export const auditPeriodActionSchema = z.object({
  note: z.string().min(1).max(5000).optional(),
  metadata: boundedMetadataSchema
});

export const closeAuditPeriodSchema = z.object({
  note: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const buildAuditSnapshotSchema = z.object({
  snapshotType: z.enum([
    "control_coverage",
    "control_evidence",
    "governance_policy",
    "policy_change",
    "policy_simulation",
    "auditor_access",
    "auditor_export",
    "audit_hash",
    "retention_archive_deletion",
    "legal_hold",
    "full_period"
  ]),
  snapshotKey: z.string().min(1).max(256),
  snapshotName: z.string().min(1).max(256),
  metadata: boundedMetadataSchema
});

export const sealSnapshotSchema = z.object({
  note: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const auditPeriodExportQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum([
      "pending",
      "approved",
      "rejected",
      "generating",
      "ready",
      "failed",
      "expired",
      "revoked"
    ])
    .optional(),
  auditPeriodId: uuidSchema.optional()
});

export const requestAuditPeriodExportSchema = z.object({
  exportType: z
    .enum([
      "full_period_bundle",
      "snapshot_bundle",
      "evidence_bundle",
      "executive_summary_bundle",
      "auditor_safe_bundle"
    ])
    .default("full_period_bundle"),
  exportFormat: z.enum(["json", "csv", "pdf"]).default("json"),
  requestedForAuditorId: uuidSchema.optional(),
  metadata: boundedMetadataSchema
});

export const approveAuditPeriodExportSchema = z.object({
  approvalNote: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const auditPeriodIdParamSchema = z.object({
  id: uuidSchema
});

export const auditSnapshotIdParamSchema = z.object({
  id: uuidSchema
});

export const auditPeriodExportIdParamSchema = z.object({
  id: uuidSchema
});
