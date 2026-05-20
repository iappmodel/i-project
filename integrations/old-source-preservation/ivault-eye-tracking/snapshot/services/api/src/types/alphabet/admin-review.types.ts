import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type AdminReviewCaseType =
  | "policy_review"
  | "external_transfer_review"
  | "compensation_review"
  | "provider_reconciliation_review"
  | "fraud_review"
  | "rights_review"
  | "payout_review"
  | "wallet_review"
  | "campaign_review"
  | "grant_review"
  | "manual_admin_action_review";

export type AdminReviewTrigger =
  | "policy_requires_review"
  | "external_transfer_unknown"
  | "compensation_requires_review"
  | "provider_reconciliation_unmatched"
  | "provider_signature_failed"
  | "duplicate_after_mutation"
  | "fraud_risk_above_threshold"
  | "rights_violation_detected"
  | "admin_manual_escalation"
  | "user_dispute"
  | "system_uncertainty";

export type AdminReviewStatus =
  | "review_created"
  | "review_queued"
  | "review_assigned"
  | "review_in_progress"
  | "review_needs_more_info"
  | "review_approved"
  | "review_rejected"
  | "review_escalated"
  | "review_closed"
  | "review_canceled";

export type AdminReviewDecision =
  | "approve_continue"
  | "approve_with_limits"
  | "reject_block"
  | "escalate"
  | "request_more_info"
  | "cancel_case"
  | "reverse_and_compensate"
  | "freeze_wallet"
  | "freeze_withdrawals"
  | "freeze_campaign"
  | "release_hold";

export type AdminReviewSeverity = "low" | "medium" | "high" | "critical";
export type AdminReviewPriority = "low" | "normal" | "high" | "urgent";

export type AdminReviewOutcomeStatus =
  | "review_ready"
  | "review_requires_assignment"
  | "review_requires_more_info"
  | "review_decision_allowed"
  | "review_decision_blocked"
  | "review_escalation_required"
  | "review_closed"
  | "review_canceled";

export interface AdminReviewSafetyScores {
  evidenceCompletenessScore: number;
  reviewerAuthorityScore: number;
  decisionConfidenceScore: number;
  downstreamSafetyScore: number;
  userImpactScore: number;
  platformRiskScore: number;
}

export interface AdminReviewSubjectIds {
  userId?: string | null;
  actorUserId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  externalTransferId?: string | null;
  compensationId?: string | null;
  policyDecisionId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;
  executionRequestId?: string | null;
  providerReconciliationId?: string | null;
}

export interface AdminReviewSignalInput {
  reviewCaseId: string;

  reviewCaseType: AdminReviewCaseType;
  reviewTrigger: AdminReviewTrigger;
  currentStatus: AdminReviewStatus;
  decision?: AdminReviewDecision | null;

  subjectIds: AdminReviewSubjectIds;

  rawEvidence: Json;
  redactedEvidence: Json;
  publicSummary?: string | null;
  internalSummary?: string | null;

  assignedReviewerId?: string | null;
  assignedTeam?: string | null;

  decidedByUserId?: string | null;
  decisionReasonCodes: string[];
  decisionNotes?: string | null;

  severity: AdminReviewSeverity;
  priority: AdminReviewPriority;

  dueAt?: string | null;
  breachedAt?: string | null;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds: string[];

  safetyScores: AdminReviewSafetyScores;

  assignmentRequested: boolean;
  reviewStarted: boolean;
  moreInfoRequested: boolean;
  decisionSubmitted: boolean;
  closeRequested: boolean;
  cancelRequested: boolean;

  now: string;
  metadata?: Json;
}

export interface AdminReviewConsoleRuleSet {
  reviewCaseType: AdminReviewCaseType;

  requiresAssignmentForHighSeverity: boolean;
  requiresAssignmentForDecision: boolean;
  requiresActorForManualAction: boolean;
  requiresEvidence: boolean;
  requiresDecisionReasonCodes: boolean;
  requiresAudit: boolean;
  requiresNotification: boolean;

  minEvidenceCompletenessScore: number;
  minReviewerAuthorityScore: number;
  minDecisionConfidenceScore: number;
  minDownstreamSafetyScore: number;
  maxPlatformRiskScore: number;
  minReviewReadinessScore: number;
  minDecisionSafetyScore: number;

  active: boolean;
}

export interface AdminReviewEvaluationResult {
  reviewCaseId: string;

  reviewCaseType: AdminReviewCaseType;
  reviewTrigger: AdminReviewTrigger;
  status: AdminReviewOutcomeStatus;

  decision?: AdminReviewDecision | null;

  reviewReadinessScore: number;
  decisionSafetyScore: number;

  ready: boolean;
  requiresAssignment: boolean;
  requiresMoreInfo: boolean;
  decisionAllowed: boolean;
  decisionBlocked: boolean;
  escalationRequired: boolean;
  closed: boolean;
  canceled: boolean;

  auditRequired: boolean;
  notificationRequired: boolean;

  reasons: string[];

  adminReviewCreatedEvent: AlphabetEvent;
  adminReviewQueuedEvent?: AlphabetEvent | null;
  adminReviewAssignedEvent?: AlphabetEvent | null;
  adminReviewStartedEvent?: AlphabetEvent | null;
  adminReviewMoreInfoRequestedEvent?: AlphabetEvent | null;
  adminReviewApprovedEvent?: AlphabetEvent | null;
  adminReviewRejectedEvent?: AlphabetEvent | null;
  adminReviewEscalatedEvent?: AlphabetEvent | null;
  adminReviewClosedEvent?: AlphabetEvent | null;
  adminReviewCanceledEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface AdminReviewPublicView {
  reviewCaseId: string;
  status: AdminReviewStatus | AdminReviewOutcomeStatus;
  reviewCaseType: AdminReviewCaseType;
  severity: AdminReviewSeverity;
  priority: AdminReviewPriority;
  publicSummary?: string | null;
  redactedEvidence: Json;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminReviewInternalView extends AdminReviewPublicView {
  rawEvidence: Json;
  internalSummary?: string | null;
  assignedReviewerId?: string | null;
  assignedTeam?: string | null;
  decision?: AdminReviewDecision | null;
  decisionReasonCodes: string[];
  decisionNotes?: string | null;
  safetyScores: AdminReviewSafetyScores | Json;
  metadata: Json;
}
