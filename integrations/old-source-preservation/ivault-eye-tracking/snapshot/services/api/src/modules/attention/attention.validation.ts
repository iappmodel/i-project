import { z } from "zod";
import {
  boundedMetadataSchema,
  idempotencyKeySchema,
  nonnegativeIntSchema,
  platformSchema,
  scoreSchema,
  uuidSchema
} from "../../shared/validation";
import { paginationQuerySchema } from "../../shared/pagination.validation";

export const startAttentionSessionSchema = z.object({
  walletId: uuidSchema,
  campaignId: uuidSchema.optional(),
  creativeId: uuidSchema.optional(),
  placementId: uuidSchema.optional(),
  deviceId: uuidSchema.optional(),
  appSessionId: uuidSchema.optional(),
  appVersion: z.string().min(1).max(64).optional(),
  platform: platformSchema.optional(),
  metadata: boundedMetadataSchema
});

export const completeAttentionSessionSchema = z.object({
  attentionSessionId: uuidSchema,
  decision: z.enum(["passed", "failed", "fraud_suspected", "inconclusive"]),
  decisionReason: z.string().min(1).max(256),
  attentionScore: scoreSchema,
  confidenceScore: scoreSchema,
  fraudRiskScore: scoreSchema,
  qualityScore: scoreSchema,
  gazeScore: scoreSchema.optional(),
  fixationScore: scoreSchema.optional(),
  livenessScore: scoreSchema.optional(),
  completionScore: scoreSchema.optional(),
  validFrameCount: nonnegativeIntSchema,
  invalidFrameCount: nonnegativeIntSchema,
  noFaceFrameCount: nonnegativeIntSchema,
  gazeInvalidFrameCount: nonnegativeIntSchema,
  rewardEligible: z.boolean().optional(),
  idempotencyKey: idempotencyKeySchema,
  metadata: boundedMetadataSchema
});

export { paginationQuerySchema as attentionHistoryQuerySchema } from "../../shared/pagination.validation";
