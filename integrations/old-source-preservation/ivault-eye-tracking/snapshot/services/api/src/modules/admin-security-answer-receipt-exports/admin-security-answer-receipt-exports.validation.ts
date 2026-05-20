import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const answerReceiptExportQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional()
});

export const createAnswerReceiptExportBundleSchema = z.object({
  answerReceiptId: uuidSchema,
  bundleType: z
    .enum([
      "receipt_export",
      "auditor_receipt_bundle",
      "customer_receipt_bundle",
      "legal_receipt_bundle",
      "admin_receipt_bundle"
    ])
    .default("receipt_export"),
  exportFormat: z
    .enum(["json", "zip", "pdf", "json_and_pdf", "zip_with_pdf"])
    .default("json"),
  includePdfSummary: z.boolean().default(false),
  metadata: boundedMetadataSchema
});

export const revokeAnswerReceiptExportBundleSchema = z.object({
  reason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
