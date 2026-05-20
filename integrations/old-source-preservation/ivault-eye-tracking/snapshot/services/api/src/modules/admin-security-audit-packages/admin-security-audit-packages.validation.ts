import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const auditPackageQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.string().min(1).max(64).optional(),
  requestType: z.string().min(1).max(128).optional(),
  packageType: z.string().min(1).max(128).optional(),
  requestScope: z.string().min(1).max(128).optional(),
  customerName: z.string().max(256).optional(),
  auditPackageId: uuidSchema.optional()
});

export const createAuditPackageRequestSchema = z.object({
  requestType: z.enum([
    "customer_evidence",
    "auditor_package",
    "regulator_bundle",
    "incident_evidence",
    "legal_hold_export",
    "governance_export",
    "retention_export",
    "internal_review",
    "full_trust_export",
    "other"
  ]),

  requestScope: z.enum([
    "global_admin",
    "customer",
    "private_room",
    "auditor_portal",
    "enterprise_review_room",
    "incident",
    "legal_hold",
    "governance_violation",
    "retention_subject"
  ]),

  title: z.string().min(1).max(512),
  description: z.string().max(4000).optional(),

  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional(),
  auditorPortalId: uuidSchema.optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  incidentId: uuidSchema.optional(),
  legalHoldId: uuidSchema.optional(),
  governanceViolationId: uuidSchema.optional(),
  retentionSubjectId: uuidSchema.optional(),

  includeRawPayloads: z.boolean().default(false),
  includeRedactedOnly: z.boolean().default(true),
  requireApproval: z.boolean().default(true),

  requestReason: z.string().max(4000).optional(),
  externalReference: z.string().max(512).optional(),
  metadata: boundedMetadataSchema
});

export const approveAuditPackageRequestSchema = z.object({
  approvalNote: z.string().max(4000).optional(),
  metadata: boundedMetadataSchema
});

export const rejectAuditPackageRequestSchema = z.object({
  rejectionReason: z.string().min(1).max(4000),
  metadata: boundedMetadataSchema
});

export const grantAuditPackageAccessSchema = z.object({
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
  accessLevel: z.enum(["view", "download", "verify", "admin"]).default("view"),
  canDownload: z.boolean().default(true),
  canVerify: z.boolean().default(true),
  canShare: z.boolean().default(false),
  maxUses: z.number().int().min(1).max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
