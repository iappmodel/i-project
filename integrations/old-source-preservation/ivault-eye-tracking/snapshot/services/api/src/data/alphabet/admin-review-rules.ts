import type { AdminReviewConsoleRuleSet } from "@/types/alphabet/admin-review.types";

export const ADMIN_REVIEW_RULES: AdminReviewConsoleRuleSet[] = [
  {
    reviewCaseType: "policy_review",
    requiresAssignmentForHighSeverity: true,
    requiresAssignmentForDecision: true,
    requiresActorForManualAction: false,
    requiresEvidence: true,
    requiresDecisionReasonCodes: true,
    requiresAudit: true,
    requiresNotification: true,
    minEvidenceCompletenessScore: 0.7,
    minReviewerAuthorityScore: 0.75,
    minDecisionConfidenceScore: 0.75,
    minDownstreamSafetyScore: 0.75,
    maxPlatformRiskScore: 0.45,
    minReviewReadinessScore: 0.7,
    minDecisionSafetyScore: 0.75,
    active: true
  },
  {
    reviewCaseType: "external_transfer_review",
    requiresAssignmentForHighSeverity: true,
    requiresAssignmentForDecision: true,
    requiresActorForManualAction: false,
    requiresEvidence: true,
    requiresDecisionReasonCodes: true,
    requiresAudit: true,
    requiresNotification: true,
    minEvidenceCompletenessScore: 0.8,
    minReviewerAuthorityScore: 0.85,
    minDecisionConfidenceScore: 0.85,
    minDownstreamSafetyScore: 0.9,
    maxPlatformRiskScore: 0.25,
    minReviewReadinessScore: 0.8,
    minDecisionSafetyScore: 0.88,
    active: true
  },
  {
    reviewCaseType: "compensation_review",
    requiresAssignmentForHighSeverity: true,
    requiresAssignmentForDecision: true,
    requiresActorForManualAction: false,
    requiresEvidence: true,
    requiresDecisionReasonCodes: true,
    requiresAudit: true,
    requiresNotification: true,
    minEvidenceCompletenessScore: 0.8,
    minReviewerAuthorityScore: 0.9,
    minDecisionConfidenceScore: 0.88,
    minDownstreamSafetyScore: 0.92,
    maxPlatformRiskScore: 0.25,
    minReviewReadinessScore: 0.82,
    minDecisionSafetyScore: 0.9,
    active: true
  },
  {
    reviewCaseType: "provider_reconciliation_review",
    requiresAssignmentForHighSeverity: true,
    requiresAssignmentForDecision: true,
    requiresActorForManualAction: false,
    requiresEvidence: true,
    requiresDecisionReasonCodes: true,
    requiresAudit: true,
    requiresNotification: false,
    minEvidenceCompletenessScore: 0.78,
    minReviewerAuthorityScore: 0.85,
    minDecisionConfidenceScore: 0.85,
    minDownstreamSafetyScore: 0.88,
    maxPlatformRiskScore: 0.3,
    minReviewReadinessScore: 0.78,
    minDecisionSafetyScore: 0.85,
    active: true
  },
  {
    reviewCaseType: "fraud_review",
    requiresAssignmentForHighSeverity: true,
    requiresAssignmentForDecision: true,
    requiresActorForManualAction: false,
    requiresEvidence: true,
    requiresDecisionReasonCodes: true,
    requiresAudit: true,
    requiresNotification: false,
    minEvidenceCompletenessScore: 0.85,
    minReviewerAuthorityScore: 0.9,
    minDecisionConfidenceScore: 0.9,
    minDownstreamSafetyScore: 0.9,
    maxPlatformRiskScore: 0.2,
    minReviewReadinessScore: 0.85,
    minDecisionSafetyScore: 0.9,
    active: true
  },
  {
    reviewCaseType: "manual_admin_action_review",
    requiresAssignmentForHighSeverity: true,
    requiresAssignmentForDecision: true,
    requiresActorForManualAction: true,
    requiresEvidence: true,
    requiresDecisionReasonCodes: true,
    requiresAudit: true,
    requiresNotification: true,
    minEvidenceCompletenessScore: 0.8,
    minReviewerAuthorityScore: 0.95,
    minDecisionConfidenceScore: 0.9,
    minDownstreamSafetyScore: 0.92,
    maxPlatformRiskScore: 0.2,
    minReviewReadinessScore: 0.85,
    minDecisionSafetyScore: 0.92,
    active: true
  }
];

export function getAdminReviewRule(reviewCaseType: string): AdminReviewConsoleRuleSet | null {
  return (
    ADMIN_REVIEW_RULES.find(
      (rule) => rule.active && rule.reviewCaseType === reviewCaseType
    ) ?? null
  );
}
