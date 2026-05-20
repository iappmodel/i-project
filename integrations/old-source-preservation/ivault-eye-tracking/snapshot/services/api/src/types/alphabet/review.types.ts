import type { AlphabetEvent } from "./event.types";

export type ReviewSubjectType =
  | "policy_check"
  | "wallet"
  | "ledger_entry"
  | "reward"
  | "conversion"
  | "withdrawal"
  | "campaign"
  | "content_rights"
  | "content_safety"
  | "creator_payout"
  | "treasury"
  | "analytics_alert"
  | "trust_score"
  | "u_value"
  | "user_account"
  | "business_account"
  | "creator_account"
  | "grant"
  | "system";

export type ReviewReason =
  | "age_restriction"
  | "region_restriction"
  | "compliance_hold"
  | "fraud_risk"
  | "safety_risk"
  | "content_rights"
  | "copyright_risk"
  | "monetization_risk"
  | "payout_hold"
  | "wallet_lock"
  | "withdrawal_hold"
  | "campaign_suspension"
  | "treasury_risk"
  | "reward_leakage"
  | "user_report"
  | "appeal"
  | "manual_review"
  | "system_anomaly";

export type ReviewPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent"
  | "critical";

export type ReviewCaseStatus =
  | "case_created"
  | "awaiting_evidence"
  | "queued"
  | "assigned"
  | "in_review"
  | "decision_made"
  | "appealed"
  | "appeal_in_review"
  | "resolved"
  | "expired"
  | "canceled";

export type ReviewerRole =
  | "system"
  | "reviewer"
  | "senior_reviewer"
  | "safety_specialist"
  | "rights_specialist"
  | "compliance_specialist"
  | "payment_specialist"
  | "treasury_specialist"
  | "admin";

export type ReviewDecision =
  | "none"
  | "uphold"
  | "overturn"
  | "partial_override"
  | "approve"
  | "reject"
  | "release_hold"
  | "maintain_hold"
  | "remove"
  | "restore"
  | "escalate"
  | "request_more_evidence";

export type ReviewOutcomeStatus =
  | "review_created"
  | "review_needs_evidence"
  | "review_queued"
  | "review_assigned"
  | "review_in_progress"
  | "review_decided"
  | "review_appealable"
  | "review_resolved"
  | "review_escalated"
  | "review_expired";

export interface ReviewCorrectionInstruction {
  targetSystem:
    | "policy"
    | "wallet"
    | "reward"
    | "conversion"
    | "withdrawal"
    | "campaign"
    | "content_rights"
    | "content_safety"
    | "creator_payout"
    | "treasury"
    | "trust"
    | "u_value"
    | "notification"
    | "audit";
  targetObjectId: string;
  action:
    | "release"
    | "restore"
    | "approve"
    | "reject"
    | "maintain_hold"
    | "reverse"
    | "limit"
    | "remove"
    | "escalate"
    | "notify"
    | "audit";
  reasonCode: string;
  payload?: Record<string, unknown>;
}

export interface ReviewCase {
  reviewCaseId: string;

  subjectType: ReviewSubjectType;
  subjectId: string;

  subjectOwnerUserId?: string | null;

  reason: ReviewReason;
  priority: ReviewPriority;
  status: ReviewCaseStatus;

  assignedReviewerRole?: ReviewerRole | null;
  assignedReviewerUserId?: string | null;

  decision: ReviewDecision;
  decisionSummary?: string | null;

  evidencePacketId?: string | null;
  sourceEventIds: string[];

  appealCount: number;
  allowedAppealLimit: number;

  slaDeadlineAt: string;
  createdAt: string;
  updatedAt: string;

  assignedAt?: string | null;
  startedAt?: string | null;
  decidedAt?: string | null;
  resolvedAt?: string | null;
}

export interface ReviewSignalInput {
  reviewCaseId: string;

  subjectType: ReviewSubjectType;
  subjectId: string;
  subjectOwnerUserId?: string | null;

  reason: ReviewReason;
  priority: ReviewPriority;
  currentStatus: ReviewCaseStatus;

  assignedReviewerRole?: ReviewerRole | null;
  assignedReviewerUserId?: string | null;

  decision: ReviewDecision;
  decisionSummary?: string | null;

  evidencePacketId?: string | null;
  sourceEventIds: string[];

  appealCount: number;
  allowedAppealLimit: number;
  appealRequested: boolean;

  slaDeadlineAt: string;
  now: string;

  decisionConfidenceScore: number;
  reviewerConfidenceScore: number;
  evidenceCompletenessScore: number;

  riskScore: number;
  severityScore: number;

  fraudRisk: number;
  safetyRisk: number;
  complianceRisk: number;
  paymentRisk: number;
  rightsRisk: number;

  downstreamCorrectionRequested: boolean;
  correctionInstructions: ReviewCorrectionInstruction[];

  requesterIsSubjectOwner: boolean;
  requesterUserId?: string | null;

  metadata?: Record<string, unknown>;
}

export interface ReviewRuleSet {
  subjectType: ReviewSubjectType;

  defaultAllowedAppealLimit: number;
  defaultSlaHours: number;

  minEvidenceCompletenessScore: number;
  minDecisionConfidenceScore: number;
  minReviewerConfidenceScore: number;
  minDecisionQualityScore: number;
  minResolutionIntegrityScore: number;

  maxRiskScoreForStandardReviewer: number;
  maxSeverityScoreForStandardReviewer: number;

  requireSpecialistForCritical: boolean;
  requireSeniorForAppeal: boolean;
  requireEvidencePacket: boolean;
  allowAppeal: boolean;
  allowSystemResolution: boolean;

  active: boolean;
}

export interface ReviewEvaluationResult {
  reviewCaseId: string;

  subjectType: ReviewSubjectType;
  subjectId: string;
  subjectOwnerUserId?: string | null;

  status: ReviewOutcomeStatus;
  decision: ReviewDecision;

  reviewPriorityScore: number;
  decisionQualityScore: number;
  appealEligibilityScore: number;
  resolutionIntegrityScore: number;

  requiresEvidence: boolean;
  requiresAssignment: boolean;
  requiresSpecialist: boolean;
  requiresSeniorReview: boolean;
  appealAllowed: boolean;
  appealCreated: boolean;
  expired: boolean;
  resolved: boolean;
  downstreamCorrectionRequired: boolean;

  correctionInstructions: ReviewCorrectionInstruction[];

  reasons: string[];

  reviewCaseCreatedEvent: AlphabetEvent;
  reviewEvidenceRequestedEvent?: AlphabetEvent | null;
  reviewCaseAssignedEvent?: AlphabetEvent | null;
  reviewStartedEvent?: AlphabetEvent | null;
  reviewDecisionMadeEvent?: AlphabetEvent | null;
  reviewAppealCreatedEvent?: AlphabetEvent | null;
  reviewAppealResolvedEvent?: AlphabetEvent | null;
  reviewCaseResolvedEvent?: AlphabetEvent | null;
  reviewCaseEscalatedEvent?: AlphabetEvent | null;
  reviewDownstreamCorrectionRequiredEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
