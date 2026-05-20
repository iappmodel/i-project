import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const trustCenterQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional()
});

export const queueTrustCenterManifestSchema = z.object({
  trustCenterKey: z.string().min(1).max(128).default("default"),
  visibility: z
    .enum(["public", "customer_only", "auditor_only", "admin_only"])
    .default("public"),
  metadata: boundedMetadataSchema
});

export const completeTrustCenterProfileSchema = z.object({
  organizationName: z.string().min(1).max(256),
  organizationDomain: z.string().max(256).optional(),
  organizationLogoUrl: z.string().max(2048).optional(),
  title: z.string().min(1).max(256),
  summary: z.string().min(1).max(5000),
  publicUrl: z.string().max(2048).optional(),
  supportEmail: z.string().email().optional(),
  securityContactEmail: z.string().email().optional(),
  showPublicTimeline: z.boolean().default(true),
  showActiveDisclosures: z.boolean().default(true),
  showRevocations: z.boolean().default(true),
  showVerificationTools: z.boolean().default(true),
  showExpiryDates: z.boolean().default(true),
  manifestEnabled: z.boolean().default(true),
  manifestRefreshMinutes: z.number().int().min(5).max(1440).default(60),
  publicMetadata: boundedMetadataSchema,
  internalMetadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
