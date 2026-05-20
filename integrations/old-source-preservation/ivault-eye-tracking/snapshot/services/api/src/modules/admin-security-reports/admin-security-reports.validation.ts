import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const securitySnapshotQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 30))
    .pipe(z.number().int().min(1).max(365)),
  status: z.enum(["healthy", "warning", "critical"]).optional()
});

export const createSecuritySnapshotSchema = z.object({
  snapshotDate: z.string().date().optional(),
  metadata: boundedMetadataSchema
});

export const securityReportQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  reportType: z.enum(["daily", "weekly", "monthly", "incident", "audit"]).optional(),
  status: z.enum(["generated", "exported", "archived"]).optional()
});

export const generateSecurityReportSchema = z
  .object({
    reportType: z.enum(["daily", "weekly", "monthly", "incident", "audit"]),
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    metadata: boundedMetadataSchema
  })
  .superRefine((value, ctx) => {
    if (new Date(value.periodEnd) < new Date(value.periodStart)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "periodEnd must be on or after periodStart",
        path: ["periodEnd"]
      });
    }
  });

export const markSecurityReportExportedSchema = z.object({
  exportFormat: z.enum(["json", "csv", "pdf", "markdown"]),
  exportUrl: z.string().url().max(2048).optional(),
  metadata: boundedMetadataSchema
});

export const securityReportIdParamSchema = z.object({
  id: uuidSchema
});
