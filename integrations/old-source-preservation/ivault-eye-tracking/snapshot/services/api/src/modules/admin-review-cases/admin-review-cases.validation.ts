import { z } from "zod";
import { boundedMetadataSchema, scoreSchema, uuidSchema } from "../../shared/validation";

const adminReviewCaseTypeSchema = z.enum([
  "policy_review",
  "external_transfer_review",
  "compensation_review",
  "provider_reconciliation_review",
  "fraud_review",
  "rights_review",
  "payout_review",
  "wallet_review",
  "campaign_review",
  "grant_review",
  "manual_admin_action_review"
]);

const adminReviewTriggerSchema = z.enum([
  "policy_requires_review",
  "external_transfer_unknown",
  "compensation_requires_review",
  "provider_reconciliation_unmatched",
  "provider_signature_failed",
  "duplicate_after_mutation",
  "fraud_risk_above_threshold",
  "rights_violation_detected",
  "admin_manual_escalation",
  "user_dispute",
  "system_uncertainty"
]);

const adminReviewSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
const adminReviewPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

const adminReviewDecisionSchema = z.enum([
  "approve_continue",
  "approve_with_limits",
  "reject_block",
  "escalate",
  "request_more_info",
  "cancel_case",
  "reverse_and_compensate",
  "freeze_wallet",
  "freeze_withdrawals",
  "freeze_campaign",
  "release_hold"
]);

const safetyScoresSchema = z
  .object({
    evidenceCompletenessScore: scoreSchema.optional(),
    reviewerAuthorityScore: scoreSchema.optional(),
    decisionConfidenceScore: scoreSchema.optional(),
    downstreamSafetyScore: scoreSchema.optional(),
    userImpactScore: scoreSchema.optional(),
    platformRiskScore: scoreSchema.optional()
  })
  .strict()
  .optional();

export const adminReviewCasesQuerySchema = z.object({
  status: z.string().min(1).max(64).optional(),
  assignedReviewerId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const reviewCaseIdParamSchema = z.object({
  reviewCaseId: uuidSchema
});

export const createAdminReviewCaseBodySchema = z.object({
  reviewCaseType: adminReviewCaseTypeSchema,
  reviewTrigger: adminReviewTriggerSchema,

  userId: uuidSchema.nullish(),
  actorUserId: uuidSchema.nullish(),
  walletId: uuidSchema.nullish(),
  contentId: uuidSchema.nullish(),
  campaignId: uuidSchema.nullish(),
  grantEligibilityId: uuidSchema.nullish(),
  externalTransferId: uuidSchema.nullish(),
  compensationId: uuidSchema.nullish(),
  policyDecisionId: uuidSchema.nullish(),
  pipelineId: uuidSchema.nullish(),
  sagaId: uuidSchema.nullish(),
  executionRequestId: uuidSchema.nullish(),
  providerReconciliationId: uuidSchema.nullish(),

  rawEvidence: z.record(z.string(), z.unknown()).optional(),
  internalSummary: z.string().max(16_000).nullish(),

  severity: adminReviewSeveritySchema.optional(),
  priority: adminReviewPrioritySchema.optional(),

  dueAt: z.string().datetime({ offset: true }).nullish(),

  idempotencyKey: z.string().min(8).max(256).nullish(),
  dedupeKey: z.string().min(8).max(256).nullish(),

  sourceEventIds: z.array(uuidSchema).optional(),

  safetyScores: safetyScoresSchema,
  metadata: boundedMetadataSchema
});

export const assignAdminReviewCaseBodySchema = z.object({
  assignedReviewerId: uuidSchema.optional(),
  assignedTeam: z.string().min(1).max(128).nullish()
});

export const decideAdminReviewCaseBodySchema = z.object({
  decision: adminReviewDecisionSchema,
  decisionReasonCodes: z.array(z.string().min(1).max(256)).min(1),
  decisionNotes: z.string().max(16_000).nullish(),
  safetyScores: safetyScoresSchema
});

export type CreateAdminReviewCaseBody = z.infer<typeof createAdminReviewCaseBodySchema>;
export type AssignAdminReviewCaseBody = z.infer<typeof assignAdminReviewCaseBodySchema>;
export type DecideAdminReviewCaseBody = z.infer<typeof decideAdminReviewCaseBodySchema>;
export type AdminReviewCasesQuery = z.infer<typeof adminReviewCasesQuerySchema>;
