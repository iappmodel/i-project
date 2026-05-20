import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const revocationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  sourceType: z.string().min(1).max(128).optional()
});

export const revokeArtifactBaseSchema = z.object({
  reasonCode: z.enum([
    "incorrect_content",
    "expired",
    "superseded",
    "customer_scope_error",
    "evidence_changed",
    "signature_compromised",
    "key_rotation",
    "legal_request",
    "security_incident",
    "access_abuse",
    "published_by_mistake",
    "internal_policy",
    "other"
  ]),
  reason: z.string().min(1).max(5000),
  publicReason: z.string().max(5000).optional(),
  notifyCustomers: z.boolean().default(true),
  notifyAuditors: z.boolean().default(false),
  metadata: boundedMetadataSchema
});

export const revokeComplianceReportSchema = revokeArtifactBaseSchema;
export const revokeQuestionnaireExportSchema = revokeArtifactBaseSchema;

export const revokeDocumentGrantSchema = revokeArtifactBaseSchema.omit({
  notifyAuditors: true
});

export const revokeTrustCenterReportSchema = revokeArtifactBaseSchema.pick({
  reasonCode: true,
  reason: true,
  publicReason: true,
  metadata: true
});

export const forceExpireArtifactSchema = z.object({
  sourceType: z.enum([
    "admin_security_compliance_report",
    "admin_security_questionnaire_export",
    "admin_security_enterprise_review_room_document_grant"
  ]),
  sourceId: uuidSchema,
  reasonCode: z.enum([
    "expired",
    "superseded",
    "internal_policy",
    "legal_request",
    "security_incident",
    "other"
  ]),
  reason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
