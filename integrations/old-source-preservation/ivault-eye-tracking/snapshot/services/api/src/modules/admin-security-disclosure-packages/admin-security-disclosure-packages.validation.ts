import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const disclosurePackageQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  disclosureType: z.string().min(1).max(128).optional(),
  sourceType: z.string().min(1).max(128).optional()
});

export const createDisclosurePackageSchema = z.object({
  disclosureType: z.enum([
    "trust_center_publication",
    "enterprise_room_publication",
    "questionnaire_export_publication",
    "compliance_report_publication",
    "security_notice_publication",
    "revocation_disclosure",
    "document_download_access",
    "other"
  ]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  sourceType: z.string().min(1).max(128),
  sourceId: uuidSchema,
  publicationTargetType: z.enum([
    "trust_center",
    "enterprise_review_room",
    "public_verification",
    "customer_download",
    "security_notice",
    "revocation_registry",
    "admin_only",
    "other"
  ]),
  publicationTargetId: uuidSchema.optional(),
  title: z.string().min(1).max(256),
  summary: z.string().min(1).max(5000),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
