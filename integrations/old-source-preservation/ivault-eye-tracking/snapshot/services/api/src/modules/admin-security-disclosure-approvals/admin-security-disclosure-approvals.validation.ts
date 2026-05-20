import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const disclosureApprovalQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  disclosureType: z.string().min(1).max(128).optional(),
  sourceType: z.string().min(1).max(128).optional()
});

export const createDisclosureApprovalSchema = z.object({
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
  title: z.string().min(1).max(256),
  summary: z.string().min(1).max(5000),
  requestedAction: z.string().min(1).max(5000),
  customerName: z.string().max(256).optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: boundedMetadataSchema
});

export const decideDisclosureApprovalSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  approvalRole: z.enum([
    "security",
    "legal",
    "second_admin",
    "owner",
    "executive",
    "other"
  ]),
  note: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
