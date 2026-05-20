export type TrustTier = 0 | 1 | 2 | 3 | 4 | 5;

export type TrustImpactSeverity =
  | "positive_small"
  | "positive_medium"
  | "positive_large"
  | "negative_small"
  | "negative_medium"
  | "negative_large"
  | "negative_severe"
  | "catastrophic";

export type TrustImpactCategory =
  | "identity"
  | "payment"
  | "safety"
  | "reputation"
  | "quality"
  | "judgment"
  | "attention"
  | "engagement"
  | "creation"
  | "learning"
  | "work"
  | "exchange"
  | "presence"
  | "moderation"
  | "system";

export type TrustImpactEventType =
  | "identity_verified"
  | "impersonation_detected"
  | "synthetic_identity_detected"
  | "ban_evasion_detected"
  | "identity_mismatch_detected"
  | "duplicate_identity_detected"
  | "bot_behavior_detected"
  | "sybil_pattern_detected"
  | "attention_verified_clean"
  | "fake_attention_detected"
  | "engagement_quality_positive"
  | "engagement_spam_detected"
  | "engagement_brigading_detected"
  | "creation_rights_verified"
  | "plagiarism_detected"
  | "ai_spam_detected"
  | "copyright_violation_confirmed"
  | "learning_verified_clean"
  | "quiz_cheating_detected"
  | "task_completed_clean"
  | "task_fraud_detected"
  | "work_dispute_lost"
  | "exchange_completed_clean"
  | "dispute_opened"
  | "dispute_resolved_user_fault"
  | "chargeback_received"
  | "refund_abuse_detected"
  | "location_verified_clean"
  | "yield_accrued_clean"
  | "grant_positive_outcome"
  | "grant_risk_or_rejection"
  | "grant_gaming_detected"
  | "grant_disqualification"
  | "valid_safety_report"
  | "false_safety_report"
  | "minor_safety_violation"
  | "harassment_confirmed"
  | "scam_confirmed"
  | "gps_spoofing_detected"
  | "moderation_decision_upheld"
  | "moderation_decision_reversed"
  | "conversion_completed_clean"
  | "conversion_fraud_detected"
  | "economy_health_clean"
  | "economy_risk_anomaly_detected"
  | "treasury_healthy"
  | "treasury_risk_detected"
  | "wallet_conversion_blocked"
  | "withdrawal_completed_clean"
  | "withdrawal_fraud_detected"
  | "withdrawal_held_for_review"
  | "creator_payout_clean"
  | "creator_payout_reversed"
  | "creator_payout_fraud_detected"
  | "compliance_blocked"
  | "admin_review_reversed_penalty"
  | "admin_review_approved"
  | "admin_restriction_applied"
  | "review_positive_resolution"
  | "review_negative_resolution"
  | "review_escalated"
  | "review_abuse_detected"
  | "admin_command_clean_execution"
  | "admin_command_failed_or_denied"
  | "notification_delivered_clean"
  | "notification_requires_review"
  | "policy_clean_decision"
  | "policy_risk_detected"
  | "policy_allowed_clean"
  | "policy_compliance_blocked"
  | "policy_risk_blocked"
  | "audit_record_clean"
  | "audit_record_risk_detected"
  | "audit_recorded_clean"
  | "audit_integrity_failed"
  | "execution_clean_dispatch"
  | "execution_risk_detected"
  | "campaign_lifecycle_clean"
  | "campaign_risk_detected"
  | "content_rights_verified_clean"
  | "content_rights_risk_detected"
  | "manual_admin_adjustment"
  | "handler_clean_validation"
  | "handler_risk_detected"
  | "saga_completed_cleanly"
  | "saga_risk_detected"
  | "action_intent_clean"
  | "action_intent_risk_detected"
  | "compensation_clean"
  | "compensation_risk_detected"
  | "external_transfer_clean"
  | "external_transfer_risk_detected"
  | "provider_reconciliation_clean"
  | "provider_reconciliation_risk_detected"
  | "admin_review_clean"
  | "admin_review_risk_detected"
  | "admin_review_hook_created_case"
  | "admin_review_hook_duplicate_skipped"
  | "admin_review_hook_failed"
  | "scheduled_job_clean"
  | "scheduled_job_failed"
  | "operational_alert_created"
  | "operational_alert_failed"
  | "financial_reconciliation_clean"
  | "financial_reconciliation_failed"
  | "wallet_invariant_clean"
  | "wallet_invariant_failed"
  | "stuck_saga_clean"
  | "stuck_saga_failed"
  | "idempotency_expiry_clean"
  | "idempotency_expiry_failed"
  | "trust_fraud_review_clean"
  | "trust_fraud_review_failed";

export interface TrustScoreState {
  userId: string;
  trustScore: number;
  trustTier: TrustTier;
  identityScore: number;
  paymentRiskScore: number;
  safetyScore: number;
  reputationScore: number;
  judgmentScore: number;
  qualityScore: number;
  severeViolationCount: number;
  catastrophicViolationCount: number;
  lastUpdatedAt: string;
  lastReviewAt?: string | null;
}

export interface TrustImpactEvent {
  eventId: string;
  userId: string;
  eventType: TrustImpactEventType;
  category: TrustImpactCategory;
  severity: TrustImpactSeverity;
  sourceEventId?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  confidence: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TrustRule {
  eventType: TrustImpactEventType;
  category: TrustImpactCategory;
  severity: TrustImpactSeverity;
  trustDelta: number;
  identityDelta: number;
  paymentRiskDelta: number;
  safetyDelta: number;
  reputationDelta: number;
  judgmentDelta: number;
  qualityDelta: number;
  requiresManualReview: boolean;
  freezesWithdrawals: boolean;
  freezesConversions: boolean;
  freezesCreatorMonetization: boolean;
  active: boolean;
}

export interface TrustScoreUpdateAuditItem {
  field: keyof Omit<
    TrustScoreState,
    "userId" | "trustTier" | "lastUpdatedAt" | "lastReviewAt"
  >;
  before: number;
  delta: number;
  after: number;
  reason: string;
}

export interface TrustScoreUpdateResult {
  updated: boolean;
  reason?: string;
  previousState: TrustScoreState;
  nextState: TrustScoreState;
  event: TrustImpactEvent;
  rule?: TrustRule;
  auditTrail: TrustScoreUpdateAuditItem[];
  flags: {
    requiresManualReview: boolean;
    freezesWithdrawals: boolean;
    freezesConversions: boolean;
    freezesCreatorMonetization: boolean;
  };
}
