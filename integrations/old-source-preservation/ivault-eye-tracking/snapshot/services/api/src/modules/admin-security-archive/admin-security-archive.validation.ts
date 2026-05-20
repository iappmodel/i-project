import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const archiveManifestQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  sourceType: z.string().min(1).max(128).optional(),
  status: z.enum(["created", "exported", "sealed", "verified", "failed"]).optional()
});

export const createArchiveManifestSchema = z.object({
  sourceType: z.string().min(1).max(128),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  storageProvider: z.string().min(1).max(128).optional(),
  storageUri: z.string().min(1).max(2048).optional(),
  checksumSha256: z.string().min(32).max(128).optional(),
  metadata: boundedMetadataSchema
});

export const sealArchiveManifestSchema = z.object({
  storageUri: z.string().min(1).max(2048),
  checksumSha256: z.string().min(32).max(128),
  metadata: boundedMetadataSchema
});

export const verifyArchiveManifestSchema = z.object({
  metadata: boundedMetadataSchema
});

export const archiveManifestIdParamSchema = z.object({
  id: uuidSchema
});

export const enqueueArchiveExportSchema = z.object({
  storageProvider: z
    .enum(["local_file", "external_archive_stub", "s3", "r2", "gcs"])
    .default("local_file"),
  metadata: boundedMetadataSchema
});

export const archiveExportJobQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum(["pending", "claimed", "running", "completed", "failed", "abandoned"])
    .optional()
});

export const enqueueArchiveVerificationSchema = z.object({
  metadata: boundedMetadataSchema
});

export const archiveVerificationJobQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z
    .enum(["pending", "claimed", "running", "passed", "failed", "abandoned"])
    .optional()
});
