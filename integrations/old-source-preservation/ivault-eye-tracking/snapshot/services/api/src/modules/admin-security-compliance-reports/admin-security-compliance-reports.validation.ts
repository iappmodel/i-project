import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const complianceReportQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum([
      "draft",
      "pending",
      "approved",
      "generating",
      "ready",
      "failed",
      "expired",
      "revoked"
    ])
    .optional(),
  auditPeriodId: uuidSchema.optional(),
  reportType: z
    .enum([
      "soc2_readiness",
      "iso27001_readiness",
      "gdpr_security_summary",
      "enterprise_security_review",
      "internal_security_review",
      "audit_period_executive_summary"
    ])
    .optional()
});

export const requestComplianceReportSchema = z.object({
  auditPeriodId: uuidSchema,
  auditPeriodExportRequestId: uuidSchema.optional(),
  reportType: z
    .enum([
      "soc2_readiness",
      "iso27001_readiness",
      "gdpr_security_summary",
      "enterprise_security_review",
      "internal_security_review",
      "audit_period_executive_summary"
    ])
    .default("audit_period_executive_summary"),
  reportFormat: z.enum(["json", "markdown", "pdf"]).default("markdown"),
  reportTitle: z.string().min(1).max(256).optional(),
  reportAudience: z
    .enum([
      "internal",
      "external_auditor",
      "enterprise_customer",
      "regulator",
      "board"
    ])
    .default("internal"),
  requestedForAuditorId: uuidSchema.optional(),
  metadata: boundedMetadataSchema
});

export const approveComplianceReportSchema = z.object({
  approvalNote: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const complianceReportIdParamSchema = z.object({
  id: uuidSchema
});
