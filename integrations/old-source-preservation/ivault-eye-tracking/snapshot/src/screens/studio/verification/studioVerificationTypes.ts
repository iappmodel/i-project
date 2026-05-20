/**
 * Stage 7 — Verification, POPS, fraud, disputes (local simulation types only).
 */

export type VerificationSubjectType =
  | "view"
  | "magic_unlock"
  | "campaign_action"
  | "tip"
  | "creator_reward"
  | "viewer_reward"
  | "payout_release"
  | "post_publish"
  | "account_action";

export type VerificationStatus =
  | "not_required"
  | "pending"
  | "passed"
  | "failed"
  | "rejected"
  | "under_review"
  | "reversed"
  | "expired";

export type VerificationGateType =
  | "watch_time"
  | "completion_rate"
  | "attention_score"
  | "human_presence"
  | "device_integrity"
  | "session_integrity"
  | "duplicate_action"
  | "velocity_check"
  | "location_proof"
  | "qr_proof"
  | "age_gate"
  | "trust_score"
  | "creator_approval"
  | "disclosure_acknowledged"
  | "payment_integrity"
  | "content_safety"
  | "rights_clearance"
  | "campaign_budget"
  | "fraud_score"
  | "pops";

export type VerificationGateStatus = "passed" | "failed" | "warning" | "pending" | "skipped";

export interface VerificationGateResult {
  id: string;
  gateType: VerificationGateType;
  status: VerificationGateStatus;
  score: number;
  threshold: number;
  message: string;
  blocking: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type FraudRiskLevel = "low" | "medium" | "high" | "critical";

export type FraudRecommendedAction =
  | "allow"
  | "allow_with_hold"
  | "require_pops"
  | "require_review"
  | "reject"
  | "reverse"
  | "suspend_mock";

export interface SettlementDecision {
  status:
    | "release_now"
    | "hold_pending"
    | "require_verification"
    | "require_review"
    | "reverse"
    | "refund"
    | "block";
  holdSeconds: number;
  reason: string;
  releaseAt?: string;
}

export type TrustImpactCategory =
  | "positive_verification"
  | "failed_verification"
  | "fraud_signal"
  | "dispute_lost"
  | "dispute_won"
  | "report_valid"
  | "creator_quality"
  | "campaign_quality";

export interface TrustImpact {
  accountId: string;
  delta: number;
  reason: string;
  category: TrustImpactCategory;
  applied: boolean;
  createdAt: string;
}

export interface VerificationRecord {
  id: string;
  subjectType: VerificationSubjectType;
  subjectId: string;
  viewerAccountId?: string;
  creatorAccountId?: string;
  campaignId?: string;
  revealId?: string;
  postId?: string;
  status: VerificationStatus;
  gates: VerificationGateResult[];
  fraudScore: number;
  trustImpact: TrustImpact[];
  settlementDecision: SettlementDecision;
  createdAt: string;
  completedAt?: string;
}

export type POPSMethod =
  | "active_tap"
  | "hold_gesture"
  | "motion_presence"
  | "camera_presence_mock"
  | "audio_presence_mock"
  | "location_presence"
  | "qr_presence"
  | "nfc_presence"
  | "session_continuity"
  | "device_attestation_mock";

export type POPSChallengeStatus = "idle" | "shown" | "passed" | "failed" | "expired";

export interface POPSChallenge {
  id: string;
  method: POPSMethod;
  prompt: string;
  status: POPSChallengeStatus;
  requiredWithinMs: number;
  completedInMs?: number;
  score: number;
  createdAt: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
}

export type FraudSignalType =
  | "repeated_unlocks"
  | "rapid_actions"
  | "impossible_watch_time"
  | "duplicate_device_mock"
  | "suspicious_session_pattern"
  | "low_attention"
  | "vpn_proxy_mock"
  | "location_mismatch"
  | "age_mismatch"
  | "payment_reversal"
  | "report_abuse"
  | "creator_self_dealing"
  | "reward_farming"
  | "bot_like_timing"
  | "campaign_frequency_cap"
  | "blocked_content_attempt";

export type FraudSeverity = "low" | "medium" | "high" | "critical";

export interface FraudSignal {
  id: string;
  type: FraudSignalType;
  severity: FraudSeverity;
  scoreImpact: number;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface FraudAssessment {
  id: string;
  subjectType: VerificationSubjectType;
  subjectId: string;
  viewerAccountId?: string;
  creatorAccountId?: string;
  riskScore: number;
  riskLevel: FraudRiskLevel;
  signals: FraudSignal[];
  recommendedAction: FraudRecommendedAction;
  createdAt: string;
}

export type DisputeReason =
  | "misleading_reveal"
  | "empty_reveal"
  | "unsafe_content"
  | "payment_issue"
  | "reward_not_received"
  | "campaign_action_rejected"
  | "privacy_violation"
  | "copyright"
  | "fraud"
  | "other";

export type DisputeStatus =
  | "open"
  | "collecting_evidence"
  | "under_review"
  | "resolved_creator_wins"
  | "resolved_viewer_wins"
  | "refunded"
  | "rejected"
  | "escalated";

export type DisputeEvidenceType =
  | "user_statement"
  | "unlock_snapshot"
  | "payment_record"
  | "safety_report"
  | "verification_record"
  | "runtime_event"
  | "creator_response"
  | "content";

export interface DisputeEvidence {
  id: string;
  type: DisputeEvidenceType;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface Dispute {
  id: string;
  reason: DisputeReason;
  status: DisputeStatus;
  reporterAccountId: string;
  creatorAccountId?: string;
  postId?: string;
  revealId?: string;
  unlockId?: string;
  campaignId?: string;
  ledgerEntryIds: string[];
  evidence: DisputeEvidence[];
  resolution?: string;
  trustImpacts: TrustImpact[];
  createdAt: string;
  resolvedAt?: string;
}
