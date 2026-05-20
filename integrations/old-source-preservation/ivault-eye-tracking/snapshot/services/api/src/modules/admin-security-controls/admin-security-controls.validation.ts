import { z } from "zod";
import { boundedMetadataSchema } from "../../shared/validation";

export const controlCoverageQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 100))
    .pipe(z.number().int().min(1).max(250)),

  frameworkKey: z.string().min(1).max(128).optional(),
  coverageStatus: z
    .enum([
      "covered",
      "missing_policy_mapping",
      "missing_evidence_mapping",
      "evidence_gap"
    ])
    .optional()
});

export const collectEvidenceSchema = z.object({
  frameworkKey: z.string().min(1).max(128).optional(),
  controlKey: z.string().min(1).max(128).optional(),
  metadata: boundedMetadataSchema
});

export const evidenceRunQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.enum(["running", "completed", "warning", "failed"]).optional()
});
