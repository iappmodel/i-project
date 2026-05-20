import type { CoinCode } from "./coin.types";

export type UValueTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type UValueImpactSeverity =
  | "positive_small"
  | "positive_medium"
  | "positive_large"
  | "positive_rare"
  | "negative_small"
  | "negative_medium"
  | "negative_large"
  | "negative_severe"
  | "catastrophic";

export type UValueImpactCategory =
  | "attention"
  | "engagement"
  | "belonging"
  | "creation"
  | "discipline"
  | "focus"
  | "growth"
  | "help"
  | "identity"
  | "judgment"
  | "knowledge"
  | "learning"
  | "mastery"
  | "nobility"
  | "originality"
  | "presence"
  | "quality"
  | "reputation"
  | "safety"
  | "trust"
  | "value"
  | "work"
  | "exchange"
  | "yield"
  | "economic"
  | "zenith"
  | "system";

export type UValueImpactEventType =
  | "alphabet_coin_earned"
  | "alphabet_coin_converted"
  | "attention_verified"
  | "engagement_meaningful"
  | "belonging_constructive"
  | "creation_valid"
  | "discipline_streak_healthy"
  | "focus_session_verified"
  | "growth_verified"
  | "help_verified"
  | "identity_verified"
  | "identity_strengthened"
  | "judgment_upheld"
  | "knowledge_verified"
  | "learning_verified"
  | "mastery_verified"
  | "noble_action_verified"
  | "originality_verified"
  | "presence_verified"
  | "quality_high"
  | "reputation_positive"
  | "reputation_verified"
  | "safety_contribution_verified"
  | "trust_tier_increased"
  | "work_completed"
  | "exchange_clean"
  | "yield_detected"
  | "yield_accrued"
  | "grant_eligible"
  | "grant_approved"
  | "grant_issued"
  | "grant_eligibility_updated"
  | "rare_grant_candidate_selected"
  | "value_grant_awarded"
  | "grant_gaming_detected"
  | "conversion_completed"
  | "conversion_fraud_detected"
  | "reward_leakage_detected"
  | "liquidity_pressure_detected"
  | "treasury_budget_blocked"
  | "treasury_liquidity_locked"
  | "withdrawal_completed"
  | "withdrawal_fraud_detected"
  | "creator_payout_approved"
  | "creator_payout_disputed"
  | "creator_payout_reversed"
  | "creator_payout_fraud_detected"
  | "admin_review_reversed_penalty"
  | "admin_review_approved"
  | "admin_restriction_applied"
  | "review_positive_resolution"
  | "review_negative_resolution"
  | "review_escalated"
  | "review_abuse_detected"
  | "admin_command_executed"
  | "admin_command_escalated"
  | "notification_action_clicked"
  | "policy_allowed"
  | "policy_limited"
  | "policy_blocked"
  | "policy_escalated"
  | "compliance_blocked"
  | "audit_integrity_failed"
  | "audit_record_completed"
  | "audit_record_escalated"
  | "audit_export_blocked"
  | "execution_completed"
  | "execution_failed"
  | "execution_denied"
  | "content_monetization_approved"
  | "content_monetization_blocked"
  | "content_rights_disputed"
  | "campaign_reward_authorized"
  | "campaign_blocked_or_suspended"
  | "zenith_awarded"
  | "spam_detected"
  | "fraud_detected"
  | "impersonation_detected"
  | "synthetic_identity_detected"
  | "identity_abuse_detected"
  | "plagiarism_detected"
  | "ai_spam_detected"
  | "false_report_detected"
  | "harassment_confirmed"
  | "minor_safety_violation"
  | "payment_abuse_detected"
  | "chargeback_received"
  | "scam_confirmed"
  | "gps_spoofing_detected"
  | "low_quality_farming_detected"
  | "admin_adjustment"
  | "handler_validation_passed"
  | "handler_validation_failed"
  | "saga_completed"
  | "saga_failed"
  | "saga_compensation_required"
  | "action_intent_accepted"
  | "action_intent_rejected"
  | "action_intent_expired"
  | "compensation_completed"
  | "compensation_failed"
  | "external_transfer_completed"
  | "external_transfer_failed"
  | "provider_reconciliation_completed"
  | "provider_reconciliation_failed"
  | "admin_review_completed"
  | "admin_review_failed"
  | "admin_review_hook_case_created"
  | "admin_review_hook_failed"
  | "scheduled_job_completed"
  | "scheduled_job_failed"
  | "operational_alert_created"
  | "operational_alert_failed"
  | "financial_reconciliation_completed"
  | "financial_reconciliation_failed"
  | "stuck_saga_passed"
  | "stuck_saga_failed"
  | "wallet_invariant_passed"
  | "wallet_invariant_failed"
  | "idempotency_expiry_completed"
  | "idempotency_expiry_failed"
  | "trust_fraud_review_completed"
  | "trust_fraud_review_failed";

export interface UValueState {
  userId: string;
  uValueScore: number;
  uValueTier: UValueTier;
  lifetimePositiveValue: number;
  lifetimeNegativeEvents: number;
  contributionScore: number;
  learningScore: number;
  creationScore: number;
  helpScore: number;
  trustScore: number;
  safetyScore: number;
  masteryScore: number;
  communityScore: number;
  economicScore: number;
  originalityScore: number;
  yieldScore: number;
  grantEligibility: boolean;
  scholarshipEligibility: boolean;
  rareRewardEligibility: boolean;
  protectionEligibility: boolean;
  boostEligibility: boolean;
  platformCitizenStatus: boolean;
  severeNegativeCount: number;
  catastrophicNegativeCount: number;
  lastUpdatedAt: string;
}

export interface UValueImpactEvent {
  eventId: string;
  userId: string;
  eventType: UValueImpactEventType;
  category: UValueImpactCategory;
  severity: UValueImpactSeverity;
  coinCode?: CoinCode | null;
  sourceEventId?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  confidence: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface UValueRule {
  eventType: UValueImpactEventType;
  category: UValueImpactCategory;
  severity: UValueImpactSeverity;
  uValueDelta: number;
  contributionDelta: number;
  learningDelta: number;
  creationDelta: number;
  helpDelta: number;
  trustDelta: number;
  safetyDelta: number;
  masteryDelta: number;
  communityDelta: number;
  economicDelta: number;
  originalityDelta: number;
  yieldDelta: number;
  canTriggerGrantEligibility: boolean;
  canTriggerScholarshipEligibility: boolean;
  canTriggerRareRewardEligibility: boolean;
  canTriggerProtectionEligibility: boolean;
  canTriggerBoostEligibility: boolean;
  canTriggerPlatformCitizenStatus: boolean;
  active: boolean;
}

export interface UValueAuditItem {
  field: keyof Omit<
    UValueState,
    | "userId"
    | "uValueTier"
    | "grantEligibility"
    | "scholarshipEligibility"
    | "rareRewardEligibility"
    | "protectionEligibility"
    | "boostEligibility"
    | "platformCitizenStatus"
    | "lastUpdatedAt"
  >;
  before: number;
  delta: number;
  after: number;
  reason: string;
}

export interface UValueUpdateResult {
  updated: boolean;
  reason?: string;
  previousState: UValueState;
  nextState: UValueState;
  event: UValueImpactEvent;
  rule?: UValueRule;
  auditTrail: UValueAuditItem[];
  eligibilityChanges: {
    grantEligibilityChanged: boolean;
    scholarshipEligibilityChanged: boolean;
    rareRewardEligibilityChanged: boolean;
    protectionEligibilityChanged: boolean;
    boostEligibilityChanged: boolean;
    platformCitizenStatusChanged: boolean;
  };
}
