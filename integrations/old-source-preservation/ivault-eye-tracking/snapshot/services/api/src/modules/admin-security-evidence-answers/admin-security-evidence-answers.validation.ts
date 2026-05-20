import { z } from "zod";
import { boundedMetadataSchema, uuidSchema } from "../../shared/validation";

export const evidenceAnswerQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(100)),
  status: z.string().min(1).max(64).optional()
});

export const createEvidenceAnswerSessionSchema = z.object({
  answerScope: z.enum([
    "public",
    "customer",
    "private_room",
    "auditor_portal",
    "enterprise_review_room",
    "admin"
  ]),
  requesterAuthUserId: uuidSchema.optional(),
  requesterEmail: z.string().email().optional(),
  requesterDisplayName: z.string().max(256).optional(),
  privateRoomId: uuidSchema.optional(),
  privateRoomParticipantId: uuidSchema.optional(),
  auditorPortalId: uuidSchema.optional(),
  auditorParticipantId: uuidSchema.optional(),
  enterpriseReviewRoomId: uuidSchema.optional(),
  customerName: z.string().max(256).optional(),
  customerDomain: z.string().max(256).optional(),
  expiresInMinutes: z.number().int().min(1).max(1440).default(60),
  maxQuestions: z.number().int().min(1).max(10000).default(100),
  allowUncitedAnswers: z.boolean().default(false),
  requireExactCitations: z.boolean().default(true),
  allowPartialAnswers: z.boolean().default(true),
  metadata: boundedMetadataSchema
});

export const generateEvidenceAnswerSchema = z.object({
  answerToken: z.string().min(32).max(256),
  questionText: z.string().min(1).max(2000),
  limit: z.number().int().min(1).max(25).default(8),
  metadata: boundedMetadataSchema
});
