import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const auditorExportDownloadParamSchema = z.object({
  id: uuidSchema
});

export const auditorExportRequestSchema = z.object({
  exportType: z.enum([
    "framework_evidence_bundle",
    "control_evidence_bundle",
    "policy_mapping_bundle",
    "audit_summary_bundle"
  ]),
  exportFormat: z.enum(["json", "csv", "pdf"]).default("json"),
  frameworkKey: z.string().min(1).max(128).optional(),
  controlKey: z.string().min(1).max(128).optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  metadata: boundedMetadataSchema
});

export const auditorExportApproveSchema = z.object({
  approvalNote: z.string().min(1).max(512),
  metadata: boundedMetadataSchema
});

export const auditorEvidenceQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 100))
    .pipe(z.number().int().min(1).max(250)),
  frameworkKey: z.string().min(1).max(128).optional(),
  controlKey: z.string().min(1).max(128).optional(),
  category: z.string().min(1).max(128).optional()
});
