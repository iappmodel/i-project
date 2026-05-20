import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

/** In-memory / legacy appeal workflow (distinct from console `AdminReviewSignalInput`). */

export type ReviewSubjectType =
  | "withdrawal"
  | "yield_grant"
  | "campaign"
  | "wallet"
  | "content"
  | string;

export type ReviewReason =
  | "fraud_risk"
  | "compliance_block"
  | "safety_risk"
  | "user_appeal"
  | "false_report"
  | "copyright_risk"
  | "identity_risk"
  | "payment_risk"
  | "dispute"
  | "grant_review"
  | "age_restriction"
  | "system_error"
  | "manual_audit"
  | string;

export type ReviewPriority = "low" | "normal" | "high" | "critical" | "urgent" | string;

export type AppealStatus =
  | "none"
  | "appeal_opened"
  | "appeal_under_review"
  | "appeal_reversed"
  | "appeal_upheld"
  | "appeal_rejected"
  | string;

export type ReviewerDecision =
  | "approve"
  | "reject"
  | "hold"
  | "escalate"
  | "restrict"
  | "uphold"
  | "require_more_info"
  | "reverse"
  | "unrestrict"
  | null;

export interface ReviewEvidencePacket {
  sourceEventIds: string[];
  sourceObjectType?: string | null;
  sourceObjectId?: string | null;
  machineSummary?: string | null;
  userExplanation?: string | null;
  reviewerNotes?: string | null;
  metadata?: Json;
}

export type ReviewCaseStatus =
  | "review_open"
  | "review_assigned"
  | "review_decided"
  | "appeal_open"
  | "appeal_decided"
  | "suspicious"
  | "escalated"
  | "closed";

export interface ReviewCase {
  reviewCaseId: string;
  subjectType: ReviewSubjectType;
  subjectId: string;
  userId?: string | null;
  walletId?: string | null;
  reason: ReviewReason;
  priority: ReviewPriority;
  assignedReviewerId: string | null;
  status: ReviewCaseStatus;
  appealStatus: AppealStatus;
  evidencePacket: ReviewEvidencePacket;
  createdAt: string;
  assignedAt: string | null;
  decidedAt: string | null;
  appealedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
}

/** Thresholds keyed by `reason` for `reviewAdminCase`. */
export interface AppealAdminReviewRuleSet {
  reason: ReviewReason;
  minEvidenceStrengthScore: number;
  minDecisionConfidenceScore: number;
  minReviewQualityScore: number;
  minPolicyConfidenceScore: number;
  minAppealMeritScore: number;
  maxReviewRiskScore: number;
  maxAppealAbuseRisk: number;
  maxManipulationRisk: number;
  maxCollusionRisk: number;
  maxReviewerBiasRisk: number;
  requiresAssignment: boolean;
  requiresEscalationForCritical: boolean;
  requiresSecondReviewer: boolean;
  allowsAutomatedClose: boolean;
  under13RequiresSpecialistReview: boolean;
  teenRequiresSpecialistReview: boolean;
  active: boolean;
}

export interface ReviewSignalInput {
  reviewCaseId: string;
  subjectType: ReviewSubjectType;
  subjectId: string;
  userId?: string | null;
  walletId?: string | null;
  reason: ReviewReason;
  priority: ReviewPriority;
  assignedReviewerId: string | null;
  evidenceStrengthScore: number;
  automatedRecommendationScore: number;
  policyConfidenceScore: number;
  reviewerConsistencyScore: number;
  reviewQualityScore: number;
  reviewerDecision: ReviewerDecision;
  decisionConfidenceScore: number;
  appealStatus: AppealStatus;
  appealEvidenceStrengthScore: number;
  appealUserCredibilityScore: number;
  appealAbuseRisk: number;
  manipulationRisk: number;
  collusionRisk: number;
  reviewerBiasRisk: number;
  policyMismatchRisk: number;
  systemErrorLikelihood: number;
  ageBand: string;
  /** Optional; callers may omit when no extra machine context is attached. */
  metadata?: Json;
}

export type AdminReviewResultStatus =
  | "review_open"
  | "review_assigned"
  | "review_decided"
  | "appeal_open"
  | "appeal_decided"
  | "suspicious"
  | "escalated"
  | "closed";

export interface AdminReviewResult {
  reviewCaseId: string;
  subjectType: ReviewSubjectType;
  subjectId: string;
  userId: string | null;
  walletId: string | null;
  status: AdminReviewResultStatus;
  appealStatus: AppealStatus;
  reviewRiskScore: number;
  reviewConfidenceScore: number;
  appealMeritScore: number;
  finalDecision: ReviewerDecision;
  lockWallet: boolean;
  lockWithdrawals: boolean;
  lockCampaigns: boolean;
  restrictUser: boolean;
  releaseHold: boolean;
  reversePenalty: boolean;
  approvePayout: boolean;
  approveGrant: boolean;
  reasons: string[];
  reviewCaseCreatedEvent: AlphabetEvent;
  reviewCaseAssignedEvent: AlphabetEvent | null;
  reviewDecisionRecordedEvent: AlphabetEvent | null;
  appealOpenedEvent: AlphabetEvent | null;
  appealDecisionRecordedEvent: AlphabetEvent | null;
  adminOverrideAppliedEvent: AlphabetEvent | null;
  reviewAbuseDetectedEvent: AlphabetEvent | null;
  metadata: Json;
}
