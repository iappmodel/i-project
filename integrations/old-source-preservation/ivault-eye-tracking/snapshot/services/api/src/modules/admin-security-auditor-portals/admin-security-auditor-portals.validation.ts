import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const auditorPortalQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),

  status: z.string().min(1).max(64).optional()
});

export const createAuditorPortalSchema = z.object({
  auditorName: z.string().min(1).max(256),
  auditorDomain: z.string().max(256).optional(),
  auditorFirm: z.string().max(256).optional(),

  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),

  auditType: z
    .enum([
      "security_review",
      "soc2",
      "iso27001",
      "privacy",
      "ai_security",
      "vendor_risk",
      "regulatory",
      "custom"
    ])
    .default("security_review"),

  auditScope: z.string().min(1).max(5000),
  title: z.string().min(1).max(256),
  summary: z.string().min(1).max(5000),

  enterpriseReviewRoomId: uuidSchema.optional(),
  auditPeriodId: uuidSchema.optional(),

  accessStartsAt: z.string().datetime().optional(),
  accessExpiresAt: z.string().datetime().optional(),

  requireAcknowledgement: z.boolean().default(true),
  allowDownloads: z.boolean().default(true),
  allowQuestions: z.boolean().default(true),
  allowTimelineAccess: z.boolean().default(true),

  metadata: boundedMetadataSchema
});

export const inviteAuditorParticipantSchema = z.object({
  email: z.string().email(),
  displayName: z.string().max(256).optional(),
  participantRole: z
    .enum([
      "lead_auditor",
      "auditor",
      "observer",
      "regulator",
      "customer_observer"
    ])
    .default("auditor"),
  authUserId: uuidSchema.optional(),
  organizationName: z.string().max(256).optional(),
  metadata: boundedMetadataSchema
});

export const publishAuditorPortalSchema = z.object({
  note: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const createEvidencePacketSchema = z.object({
  packetType: z
    .enum([
      "evidence_packet",
      "report_packet",
      "questionnaire_packet",
      "audit_period_packet",
      "disclosure_package_packet",
      "custom"
    ])
    .default("evidence_packet"),

  title: z.string().min(1).max(256),
  summary: z.string().min(1).max(5000),
  scope: z.string().min(1).max(5000),

  disclosurePackageId: uuidSchema.optional(),
  complianceReportRequestId: uuidSchema.optional(),
  questionnaireExportId: uuidSchema.optional(),
  auditPeriodExportRequestId: uuidSchema.optional(),

  allowDownload: z.boolean().default(true),
  requireAcknowledgement: z.boolean().default(true),

  metadata: boundedMetadataSchema
});

export const addEvidencePacketItemSchema = z.object({
  itemType: z.enum([
    "control_summary",
    "policy_summary",
    "signed_report",
    "questionnaire_response",
    "audit_export",
    "disclosure_package",
    "timeline_event",
    "revocation_record",
    "manual_reference",
    "other"
  ]),

  sourceType: z.string().min(1).max(128),
  sourceId: uuidSchema.optional(),

  displayTitle: z.string().min(1).max(256),
  displaySummary: z.string().min(1).max(5000),

  itemKey: z.string().max(512).optional(),
  controlKey: z.string().max(256).optional(),
  frameworkKey: z.string().max(256).optional(),

  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  signature: z.string().max(2048).optional(),
  signedAt: z.string().datetime().optional(),

  publicSafe: z.boolean().default(true),
  auditorSafe: z.boolean().default(true),
  allowDownload: z.boolean().default(false),

  sortOrder: z.number().int().min(0).max(100000).default(0),

  metadata: boundedMetadataSchema
});

export const publishEvidencePacketSchema = z.object({
  note: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const answerAuditorQuestionSchema = z.object({
  answerText: z.string().min(1).max(30000),
  internalNote: z.string().max(10000).optional(),
  closeQuestion: z.boolean().default(true),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
