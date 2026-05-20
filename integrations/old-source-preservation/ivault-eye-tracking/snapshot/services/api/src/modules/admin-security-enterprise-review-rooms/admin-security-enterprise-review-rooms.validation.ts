import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const enterpriseReviewRoomQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.enum(["draft", "published", "expired", "revoked", "archived"]).optional()
});

export const createEnterpriseReviewRoomSchema = z.object({
  customerName: z.string().min(1).max(256),
  customerDomain: z.string().min(1).max(256).optional(),
  customerExternalId: z.string().max(256).optional(),
  roomTitle: z.string().min(1).max(256),
  roomSummary: z.string().min(1).max(5000),
  reviewType: z
    .enum([
      "enterprise_security_review",
      "vendor_security_review",
      "procurement_review",
      "compliance_review",
      "security_questionnaire",
      "strategic_customer_review"
    ])
    .default("enterprise_security_review"),
  salesOwnerAuthUserId: uuidSchema.optional(),
  securityOwnerAuthUserId: uuidSchema.optional(),
  accessStartsAt: z.string().datetime().optional(),
  accessExpiresAt: z.string().datetime(),
  requireNda: z.boolean().default(true),
  requireEmailDomainMatch: z.boolean().default(false),
  metadata: boundedMetadataSchema
});

export const publishEnterpriseReviewRoomSchema = z.object({
  note: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const inviteEnterpriseReviewRoomParticipantSchema = z.object({
  email: z.string().email(),
  displayName: z.string().max(256).optional(),
  organizationName: z.string().max(256).optional(),
  participantType: z
    .enum([
      "customer_reviewer",
      "customer_admin",
      "procurement",
      "legal",
      "security",
      "sales_owner",
      "internal_security_owner",
      "external_auditor"
    ])
    .default("customer_reviewer"),
  roleTitle: z.string().max(256).optional(),
  authUserId: uuidSchema.optional(),
  metadata: boundedMetadataSchema
});

export const grantEnterpriseReviewRoomDocumentSchema = z.object({
  documentType: z.enum([
    "compliance_report",
    "audit_period_export",
    "trust_center_report",
    "security_overview",
    "penetration_test_summary",
    "questionnaire_response",
    "other"
  ]),
  displayTitle: z.string().min(1).max(256),
  displaySummary: z.string().min(1).max(2000),
  complianceReportRequestId: uuidSchema.optional(),
  auditPeriodExportRequestId: uuidSchema.optional(),
  trustCenterReportId: uuidSchema.optional(),
  visibility: z
    .enum(["room_only", "participant_specific", "download_disabled"])
    .default("room_only"),
  allowDownload: z.boolean().default(true),
  allowPublicVerification: z.boolean().default(true),
  accessStartsAt: z.string().datetime().optional(),
  accessExpiresAt: z.string().datetime().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  metadata: boundedMetadataSchema
});

export const revokeEnterpriseReviewRoomSchema = z.object({
  revokeReason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const acceptEnterpriseReviewRoomNdaSchema = z.object({
  roomKey: z.string().min(1).max(512),
  email: z.string().email(),
  ndaVersion: z.string().min(1).max(128),
  metadata: boundedMetadataSchema
});

export const enterpriseReviewRoomKeyParamSchema = z.object({
  roomKey: z.string().min(1).max(512)
});

export const enterpriseReviewRoomDocumentDownloadParamSchema = z.object({
  roomKey: z.string().min(1).max(512),
  documentGrantId: uuidSchema
});

export const enterpriseReviewRoomIdParamSchema = z.object({
  id: uuidSchema
});
