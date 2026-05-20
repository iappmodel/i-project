import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const trustTransparencyQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.string().min(1).max(64).optional(),
  portalType: z.string().min(1).max(128).optional(),
  visibility: z.string().min(1).max(64).optional(),
  customerName: z.string().max(256).optional(),
  transparencyPortalId: uuidSchema.optional()
});

export const createTrustTransparencyPortalSchema = z.object({
  portalType: z
    .enum([
      "public_trust_center",
      "customer_trust_center",
      "auditor_trust_center",
      "regulator_trust_center",
      "incident_status_page",
      "other"
    ])
    .default("customer_trust_center"),

  visibility: z.enum(["public", "private", "restricted", "invite_only"]).default("private"),

  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,120}$/),
  title: z.string().min(1).max(512),
  subtitle: z.string().max(512).optional(),
  description: z.string().max(4000).optional(),

  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),

  privateRoomId: uuidSchema.optional(),
  auditorPortalId: uuidSchema.optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),

  requireAuth: z.boolean().default(true),
  allowPublicVerification: z.boolean().default(true),
  allowPackageAccessRequest: z.boolean().default(false),

  brandPayload: z.record(z.string(), z.unknown()).default({}),
  contentPayload: z.record(z.string(), z.unknown()).default({}),
  metadata: boundedMetadataSchema
});

export const grantTrustTransparencyAccessSchema = z.object({
  granteeType: z.enum([
    "customer",
    "auditor",
    "regulator",
    "legal",
    "admin",
    "external_reviewer"
  ]),
  granteeEmail: z.string().email(),
  granteeDisplayName: z.string().max(256).optional(),
  accessLevel: z.enum(["view", "proofs", "packages", "admin"]).default("view"),
  canViewNotices: z.boolean().default(true),
  canViewProofs: z.boolean().default(true),
  canViewPackages: z.boolean().default(false),
  canRequestPackages: z.boolean().default(false),
  maxUses: z.number().int().min(1).max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
