import type { AgeBand } from "./age-guardian.types";
import type { AlphabetEvent } from "./event.types";

export type PolicyActionType =
  | "view_content"
  | "earn_reward"
  | "issue_reward"
  | "open_wallet"
  | "spend"
  | "withdraw"
  | "convert"
  | "tip"
  | "creator_payout"
  | "create_content"
  | "monetize_content"
  | "boost_content"
  | "join_campaign"
  | "launch_campaign"
  | "message_user"
  | "livestream"
  | "share_external_link"
  | "store_user_data"
  | "use_location"
  | "serve_ads"
  | "issue_grant"
  | "admin_command"
  | "review_decision"
  | "audit_export"
  | "system_action";

export type PolicyDomain =
  | "age"
  | "safety"
  | "rights"
  | "trust"
  | "wallet"
  | "payment"
  | "campaign"
  | "creator"
  | "treasury"
  | "grant"
  | "review"
  | "audit"
  | "notification"
  | "admin"
  | "system";

export type PolicyDecision =
  | "allow"
  | "allow_with_limits"
  | "hold"
  | "require_guardian"
  | "require_review"
  | "require_audit"
  | "require_treasury"
  | "require_verification"
  | "block"
  | "escalate";

export type PolicyOutcomeStatus =
  | "policy_allowed"
  | "policy_limited"
  | "policy_held"
  | "policy_guardian_required"
  | "policy_review_required"
  | "policy_audit_required"
  | "policy_treasury_required"
  | "policy_verification_required"
  | "policy_blocked"
  | "policy_escalated";

export type PolicyGateName =
  | "age"
  | "safety"
  | "rights"
  | "trust"
  | "wallet"
  | "payment"
  | "campaign"
  | "treasury"
  | "grant"
  | "review"
  | "audit"
  | "admin";

export type PolicyGateDecision =
  | "pass"
  | "limited"
  | "hold"
  | "required"
  | "fail"
  | "skipped";

export interface PolicyGateResult {
  gateName: PolicyGateName;
  decision: PolicyGateDecision;
  score: number;
  riskScore: number;
  hardBlock: boolean;
  reasonCodes: string[];
  sourceObjectId?: string | null;
  sourceEventId?: string | null;
}

export interface PolicyRiskSignals {
  ageRisk: number;
  safetyRisk: number;
  rightsRisk: number;
  fraudRisk: number;
  paymentRisk: number;
  treasuryRisk: number;
  privacyRisk: number;
  complianceRisk: number;
  reputationRisk: number;
}

export interface PolicyDownstreamInstruction {
  targetSystem:
    | "wallet"
    | "reward"
    | "conversion"
    | "withdrawal"
    | "campaign"
    | "creator_payout"
    | "content_rights"
    | "content_safety"
    | "age_guardian"
    | "grant"
    | "treasury"
    | "review"
    | "audit"
    | "notification"
    | "admin"
    | "system";
  targetObjectId?: string | null;
  action:
    | "allow"
    | "limit"
    | "hold"
    | "block"
    | "escalate"
    | "request_guardian"
    | "create_review"
    | "create_audit"
    | "reserve_treasury"
    | "request_verification"
    | "notify";
  reasonCode: string;
  payload?: Record<string, unknown>;
}

export interface PolicyDecisionRecord {
  policyDecisionId: string;

  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;

  actionType: PolicyActionType;
  primaryDomain: PolicyDomain;

  decision: PolicyDecision;
  status: PolicyOutcomeStatus;

  gateResults: PolicyGateResult[];
  riskSignals: PolicyRiskSignals;

  ageBand: AgeBand;
  trustScore: number;
  uValueScore: number;

  walletStatus?: string | null;
  contentSafetyStatus?: string | null;
  contentRightsStatus?: string | null;
  treasuryReserveStatus?: string | null;
  reviewStatus?: string | null;
  auditStatus?: string | null;
  adminCommandStatus?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface PolicyOrchestratorSignalInput {
  policyDecisionId: string;

  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;

  actionType: PolicyActionType;
  primaryDomain: PolicyDomain;

  gateResults: PolicyGateResult[];
  riskSignals: PolicyRiskSignals;

  ageBand: AgeBand;
  trustScore: number;
  uValueScore: number;

  walletStatus?: string | null;
  contentSafetyStatus?: string | null;
  contentRightsStatus?: string | null;
  treasuryReserveStatus?: string | null;
  reviewStatus?: string | null;
  auditStatus?: string | null;
  adminCommandStatus?: string | null;

  actionRequested: boolean;
  reviewRequested: boolean;
  auditRequested: boolean;
  treasuryRequested: boolean;
  notificationRequested: boolean;

  metadata?: Record<string, unknown>;
}

export interface PolicyOrchestratorRuleSet {
  actionType: PolicyActionType;

  requiredGates: PolicyGateName[];

  minGatePassScore: number;
  minUserEligibilityScore: number;
  minActionSafetyScore: number;
  maxOverallPolicyRiskScore: number;

  minTrustScore: number;
  minUValueScore: number;

  blockUnknownAge: boolean;
  requiresReview: boolean;
  requiresAudit: boolean;
  requiresTreasury: boolean;
  requiresWallet: boolean;
  requiresRights: boolean;
  requiresSafety: boolean;
  requiresAdmin: boolean;

  sensitiveAction: boolean;
  monetaryAction: boolean;
  publicAction: boolean;

  active: boolean;
}

export interface PolicyOrchestratorEvaluationResult {
  policyDecisionId: string;

  userId: string;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;

  actionType: PolicyActionType;
  primaryDomain: PolicyDomain;

  status: PolicyOutcomeStatus;
  decision: PolicyDecision;

  overallPolicyRiskScore: number;
  gatePassScore: number;
  userEligibilityScore: number;
  actionSafetyScore: number;

  allowed: boolean;
  limited: boolean;
  held: boolean;
  blocked: boolean;
  escalated: boolean;

  guardianRequired: boolean;
  reviewRequired: boolean;
  auditRequired: boolean;
  treasuryRequired: boolean;
  verificationRequired: boolean;

  failedGates: PolicyGateResult[];
  requiredGatesMissing: PolicyGateName[];

  downstreamInstructions: PolicyDownstreamInstruction[];

  reasons: string[];

  policyDecisionCreatedEvent: AlphabetEvent;
  policyAllowedEvent?: AlphabetEvent | null;
  policyLimitedEvent?: AlphabetEvent | null;
  policyHeldEvent?: AlphabetEvent | null;
  policyGuardianRequiredEvent?: AlphabetEvent | null;
  policyReviewRequiredEvent?: AlphabetEvent | null;
  policyAuditRequiredEvent?: AlphabetEvent | null;
  policyTreasuryRequiredEvent?: AlphabetEvent | null;
  policyVerificationRequiredEvent?: AlphabetEvent | null;
  policyBlockedEvent?: AlphabetEvent | null;
  policyEscalatedEvent?: AlphabetEvent | null;
  policyGateFailedEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
