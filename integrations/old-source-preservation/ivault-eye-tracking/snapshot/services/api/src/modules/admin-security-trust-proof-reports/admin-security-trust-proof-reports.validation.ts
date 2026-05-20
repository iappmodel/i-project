import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const trustProofReportQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional(),
  reportScope: z.string().min(1).max(64).optional(),
  customerName: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional()
});

export const createTrustProofReportSchema = z.object({
  reportScope: z.enum([
    "public",
    "customer",
    "private_room",
    "auditor_portal",
    "enterprise_review_room",
    "admin"
  ]),
  reportType: z
    .enum([
      "customer_security_review",
      "auditor_review",
      "trust_center_summary",
      "private_room_summary",
      "proof_timeline_report",
      "answer_receipt_report",
      "legal_archive",
      "admin_internal"
    ])
    .default("customer_security_review"),
  reportFormat: z
    .enum(["html", "pdf", "json", "html_and_pdf", "zip"])
    .default("html"),
  title: z.string().min(1).max(512).optional(),
  subtitle: z.string().max(512).optional(),
  executiveSummary: z.string().max(5000).optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional(),
  privateRoomParticipantId: uuidSchema.optional(),
  auditorPortalId: uuidSchema.optional(),
  auditorParticipantId: uuidSchema.optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  requesterAuthUserId: uuidSchema.optional(),
  requesterEmail: z.string().email().optional(),
  requesterDisplayName: z.string().max(256).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  metadata: boundedMetadataSchema
});

export const revokeTrustProofReportSchema = z.object({
  reason: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

export const idParamSchema = z.object({
  id: uuidSchema
});
