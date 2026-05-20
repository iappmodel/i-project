import type { AlphabetEvent } from "./event.types";
import type { AgeBand } from "./age-guardian.types";

export type ActionIntentType =
  | "view_content"
  | "watch_content"
  | "verify_presence"
  | "earn_reward"
  | "issue_reward"
  | "open_wallet"
  | "spend"
  | "withdraw"
  | "convert"
  | "tip"
  | "creator_payout"
  | "create_content"
  | "upload_content"
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
  | "request_guardian_permission"
  | "admin_command"
  | "review_decision"
  | "audit_export"
  | "notification_delivery"
  | "system_action";

export type ActionIntentSource =
  | "user"
  | "creator"
  | "business"
  | "admin"
  | "moderator"
  | "system"
  | "scheduler"
  | "webhook"
  | "partner_api";

export type ActionIntentRecordStatus =
  | "intent_created"
  | "context_captured"
  | "precheck_passed"
  | "precheck_failed"
  | "policy_requested"
  | "saga_requested"
  | "accepted"
  | "rejected"
  | "canceled"
  | "expired";

export type ActionIntentOutcomeStatus =
  | "intent_ready"
  | "intent_needs_context"
  | "intent_duplicate"
  | "intent_policy_required"
  | "intent_saga_required"
  | "intent_rejected"
  | "intent_canceled"
  | "intent_expired";

export type ActionIntentSurface =
  | "feed"
  | "wallet"
  | "creator_studio"
  | "campaign_builder"
  | "admin_console"
  | "review_queue"
  | "notification"
  | "profile"
  | "api"
  | "system";

export interface ActionIntentContext {
  surface: ActionIntentSurface;
  objectType?: string | null;
  objectId?: string | null;

  amount?: number | null;
  coinCode?: string | null;

  regionCode?: string | null;
  ageBand: AgeBand;

  trustScore?: number | null;
  uValueScore?: number | null;

  walletStatus?: string | null;
  contentSafetyStatus?: string | null;
  contentRightsStatus?: string | null;
  campaignStatus?: string | null;
  treasuryStatus?: string | null;

  metadata?: Record<string, unknown>;
}

export interface ActionIntentRiskSignals {
  ageRisk: number;
  safetyRisk: number;
  rightsRisk: number;
  fraudRisk: number;
  paymentRisk: number;
  privacyRisk: number;
  complianceRisk: number;
  duplicateRisk: number;
}

export interface ActionIntentRecord {
  actionIntentId: string;

  intentType: ActionIntentType;
  intentSource: ActionIntentSource;
  status: ActionIntentRecordStatus;

  userId: string;
  actorUserId?: string | null;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;

  sessionId?: string | null;
  deviceId?: string | null;
  clientRequestId?: string | null;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds: string[];

  context: ActionIntentContext;
  riskSignals: ActionIntentRiskSignals;

  expiresAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ActionIntentSignalInput {
  actionIntentId: string;

  intentType: ActionIntentType;
  intentSource: ActionIntentSource;
  currentStatus: ActionIntentRecordStatus;

  userId: string;
  actorUserId?: string | null;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;

  sessionId?: string | null;
  deviceId?: string | null;
  clientRequestId?: string | null;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  duplicateIntentCount: number;

  sourceEventIds: string[];

  context: ActionIntentContext;
  riskSignals: ActionIntentRiskSignals;

  expiresAt?: string | null;
  now: string;

  contextCaptured: boolean;
  policyRequested: boolean;
  sagaRequested: boolean;
  cancelRequested: boolean;

  metadata?: Record<string, unknown>;
}

export interface ActionIntentRuleSet {
  intentType: ActionIntentType;

  requiresPolicy: boolean;
  requiresSaga: boolean;
  requiresActorUser: boolean;
  requiresWallet: boolean;
  requiresContent: boolean;
  requiresCampaign: boolean;
  requiresAmount: boolean;
  requiresCoinCode: boolean;
  requiresIdempotency: boolean;
  requiresDedupe: boolean;
  requiresAudit: boolean;

  sensitiveAction: boolean;
  monetaryAction: boolean;
  publicAction: boolean;
  adminAction: boolean;

  minContextCompletenessScore: number;
  minIntentLegitimacyScore: number;
  minRoutingReadinessScore: number;
  maxPrecheckRiskScore: number;

  defaultExpirationMinutes: number;

  active: boolean;
}

export interface ActionIntentEvaluationResult {
  actionIntentId: string;

  intentType: ActionIntentType;
  intentSource: ActionIntentSource;
  status: ActionIntentOutcomeStatus;

  userId: string;
  actorUserId?: string | null;
  creatorId?: string | null;
  businessId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;

  contextCompletenessScore: number;
  intentLegitimacyScore: number;
  precheckRiskScore: number;
  routingReadinessScore: number;

  ready: boolean;
  needsContext: boolean;
  duplicate: boolean;
  policyRequired: boolean;
  sagaRequired: boolean;
  rejected: boolean;
  canceled: boolean;
  expired: boolean;

  policyRequest: {
    required: boolean;
    actionType: string;
    primaryDomain: string;
    reasonCodes: string[];
  };

  sagaRequest: {
    required: boolean;
    sagaType: string;
    reasonCodes: string[];
  };

  dedupeOutput: {
    idempotencyKey?: string | null;
    dedupeKey?: string | null;
    duplicateIntentCount: number;
    shouldBlockDuplicate: boolean;
  };

  auditRecommended: boolean;
  notificationRecommended: boolean;

  reasons: string[];

  actionIntentCreatedEvent: AlphabetEvent;
  actionIntentContextCapturedEvent?: AlphabetEvent | null;
  actionIntentPrecheckPassedEvent?: AlphabetEvent | null;
  actionIntentPrecheckFailedEvent?: AlphabetEvent | null;
  actionIntentPolicyRequestedEvent?: AlphabetEvent | null;
  actionIntentSagaRequestedEvent?: AlphabetEvent | null;
  actionIntentAcceptedEvent?: AlphabetEvent | null;
  actionIntentRejectedEvent?: AlphabetEvent | null;
  actionIntentCanceledEvent?: AlphabetEvent | null;
  actionIntentExpiredEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
