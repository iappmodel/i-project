import { z } from "zod";
import { boundedMetadataSchema } from "../../shared/validation";

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const requestAiDraftSchema = z.object({
  draftMode: z
    .enum([
      "match_only",
      "draft_only",
      "match_then_draft",
      "evidence_summary_only"
    ])
    .default("match_then_draft"),
  metadata: boundedMetadataSchema
});

export const acceptAiDraftSchema = z.object({
  note: z.string().min(1).max(5000),
  metadata: boundedMetadataSchema
});

const uuidSchema = z.string().uuid();

export const publishQuestionnaireExportToRoomSchema = z.object({
  enterpriseReviewRoomId: uuidSchema,
  displayTitle: z.string().min(1).max(256).optional(),
  displaySummary: z.string().min(1).max(2000).optional(),
  allowDownload: z.boolean().default(true),
  allowPublicVerification: z.boolean().default(true),
  accessExpiresAt: z.string().datetime().optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  metadata: boundedMetadataSchema
});
