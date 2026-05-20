import { ACTION_INTENT_RULES } from "@/data/alphabet/action-intent-rules";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  ActionIntentEvaluationResult,
  ActionIntentOutcomeStatus,
  ActionIntentRuleSet,
  ActionIntentSignalInput
} from "@/types/alphabet/action-intent.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: ActionIntentSignalInput): ActionIntentRuleSet | undefined {
  return ACTION_INTENT_RULES.find(
    (rule) => rule.active && rule.intentType === input.intentType
  );
}

function isExpired(input: ActionIntentSignalInput): boolean {
  if (!input.expiresAt) return false;
  return new Date(input.now).getTime() > new Date(input.expiresAt).getTime();
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function calculateContextCompletenessScore(
  input: ActionIntentSignalInput,
  rule?: ActionIntentRuleSet
): number {
  let score = 0;

  score += hasValue(input.userId) ? 0.12 : 0;
  score += hasValue(input.context.surface) ? 0.08 : 0;
  score += hasValue(input.context.ageBand) ? 0.08 : 0;
  score += hasValue(input.context.regionCode) ? 0.06 : 0;
  score += hasValue(input.sessionId) ? 0.05 : 0;
  score += hasValue(input.deviceId) ? 0.05 : 0;
  score += hasValue(input.clientRequestId) ? 0.05 : 0;
  score += input.sourceEventIds.length > 0 ? 0.05 : 0;

  if (rule?.requiresActorUser) score += hasValue(input.actorUserId) ? 0.08 : 0;
  else score += 0.04;

  if (rule?.requiresWallet) score += hasValue(input.walletId) ? 0.08 : 0;
  else score += 0.04;

  if (rule?.requiresContent) score += hasValue(input.contentId) ? 0.08 : 0;
  else score += 0.04;

  if (rule?.requiresCampaign) score += hasValue(input.campaignId) ? 0.08 : 0;
  else score += 0.04;

  if (rule?.requiresAmount)
    score += typeof input.context.amount === "number" && input.context.amount > 0 ? 0.08 : 0;
  else score += 0.04;

  if (rule?.requiresCoinCode) score += hasValue(input.context.coinCode) ? 0.06 : 0;
  else score += 0.03;

  if (rule?.requiresIdempotency) score += hasValue(input.idempotencyKey) ? 0.08 : 0;
  else score += 0.04;

  if (rule?.requiresDedupe) score += hasValue(input.dedupeKey) ? 0.06 : 0;
  else score += 0.03;

  return clamp(score);
}

function calculatePrecheckRiskScore(input: ActionIntentSignalInput): number {
  const r = input.riskSignals;

  let risk =
    clamp(r.ageRisk) * 0.13 +
    clamp(r.safetyRisk) * 0.14 +
    clamp(r.rightsRisk) * 0.11 +
    clamp(r.fraudRisk) * 0.18 +
    clamp(r.paymentRisk) * 0.14 +
    clamp(r.privacyRisk) * 0.11 +
    clamp(r.complianceRisk) * 0.14 +
    clamp(r.duplicateRisk) * 0.05;

  if (input.context.ageBand === "unknown") risk += 0.08;
  if (input.duplicateIntentCount > 0) risk += Math.min(0.15, input.duplicateIntentCount * 0.05);
  if (!input.sessionId) risk += 0.03;
  if (!input.deviceId) risk += 0.03;

  return clamp(risk);
}

function calculateIntentLegitimacyScore(input: ActionIntentSignalInput): number {
  const risk = calculatePrecheckRiskScore(input);

  const identityScore =
    input.intentSource === "system" || input.intentSource === "scheduler"
      ? 0.8
      : hasValue(input.userId)
        ? 0.75
        : 0.25;

  const requestScore =
    (input.clientRequestId ? 0.25 : 0.1) +
    (input.sessionId ? 0.2 : 0.08) +
    (input.deviceId ? 0.2 : 0.08);

  const dedupeScore = input.duplicateIntentCount === 0 ? 0.18 : 0;

  // Weights sized so a typical user + session + device + clientRequest clears high minIntentLegitimacyScore bars (e.g. withdraw 0.85).
  return clamp(
    identityScore * 0.42 + requestScore * 0.38 + dedupeScore + (1 - risk) * 0.15
  );
}

function calculateRoutingReadinessScore(
  input: ActionIntentSignalInput,
  rule?: ActionIntentRuleSet
): number {
  const contextScore = calculateContextCompletenessScore(input, rule);
  const legitimacyScore = calculateIntentLegitimacyScore(input);
  const riskScore = calculatePrecheckRiskScore(input);

  const policyScore = rule?.requiresPolicy ? (input.policyRequested ? 0.09 : 0.045) : 0.09;
  const sagaScore = rule?.requiresSaga ? (input.sagaRequested ? 0.09 : 0.045) : 0.09;

  // Weights sum to 1.0 so strong context + low risk + requested policy/saga clears high minRoutingReadinessScore (e.g. withdraw 0.88).
  return clamp(
    contextScore * 0.34 +
      legitimacyScore * 0.26 +
      (1 - riskScore) * 0.22 +
      policyScore +
      sagaScore
  );
}

function mapIntentToPolicyAction(intentType: ActionIntentSignalInput["intentType"]): string {
  switch (intentType) {
    case "watch_content":
      return "view_content";
    case "verify_presence":
    case "earn_reward":
      return "earn_reward";
    case "upload_content":
      return "create_content";
    case "request_guardian_permission":
      return "store_user_data";
    default:
      return intentType;
  }
}

function mapIntentToPolicyDomain(intentType: ActionIntentSignalInput["intentType"]): string {
  switch (intentType) {
    case "view_content":
    case "watch_content":
    case "livestream":
      return "safety";
    case "monetize_content":
    case "create_content":
    case "upload_content":
      return "rights";
    case "withdraw":
    case "spend":
    case "open_wallet":
    case "convert":
    case "tip":
    case "creator_payout":
    case "issue_reward":
      return "payment";
    case "launch_campaign":
    case "join_campaign":
    case "boost_content":
    case "verify_presence":
      return "campaign";
    case "issue_grant":
    case "earn_reward":
      return "grant";
    case "admin_command":
    case "audit_export":
    case "review_decision":
      return "admin";
    case "request_guardian_permission":
    case "store_user_data":
    case "use_location":
      return "age";
    case "message_user":
    case "share_external_link":
      return "privacy";
    case "serve_ads":
      return "compliance";
    case "notification_delivery":
    case "system_action":
    default:
      return "system";
  }
}

function mapIntentToSagaType(intentType: ActionIntentSignalInput["intentType"]): string {
  switch (intentType) {
    case "earn_reward":
    case "issue_reward":
    case "verify_presence":
      return "reward_issuance";
    case "withdraw":
      return "withdrawal";
    case "convert":
      return "conversion";
    case "creator_payout":
      return "creator_payout";
    case "launch_campaign":
      return "campaign_launch";
    case "join_campaign":
      return "campaign_join";
    case "monetize_content":
      return "content_monetization";
    case "issue_grant":
      return "grant_issuance";
    case "admin_command":
      return "admin_command";
    case "audit_export":
      return "audit_export";
    case "notification_delivery":
      return "notification_delivery";
    case "request_guardian_permission":
      return "guardian_permission";
    default:
      return "system_action";
  }
}

function decideActionIntentOutcome(params: {
  input: ActionIntentSignalInput;
  rule: ActionIntentRuleSet;
  contextCompletenessScore: number;
  intentLegitimacyScore: number;
  precheckRiskScore: number;
  routingReadinessScore: number;
  reasons: string[];
}): ActionIntentOutcomeStatus {
  const {
    input,
    rule,
    contextCompletenessScore,
    intentLegitimacyScore,
    precheckRiskScore,
    routingReadinessScore,
    reasons
  } = params;

  if (input.cancelRequested) {
    reasons.push("action_intent_canceled");
    return "intent_canceled";
  }

  if (isExpired(input)) {
    reasons.push("action_intent_expired");
    return "intent_expired";
  }

  if (input.duplicateIntentCount > 0 && input.dedupeKey) {
    reasons.push("duplicate_action_intent_detected");
    return "intent_duplicate";
  }

  if (rule.requiresActorUser && !input.actorUserId) {
    reasons.push("actor_user_required");
    return "intent_needs_context";
  }

  if (rule.adminAction && input.intentSource !== "admin" && input.intentSource !== "moderator") {
    reasons.push("admin_action_requires_admin_or_moderator_source");
    return "intent_rejected";
  }

  if (rule.requiresWallet && !input.walletId) {
    reasons.push("wallet_required");
    return "intent_needs_context";
  }

  if (rule.requiresContent && !input.contentId) {
    reasons.push("content_required");
    return "intent_needs_context";
  }

  if (rule.requiresCampaign && !input.campaignId) {
    reasons.push("campaign_required");
    return "intent_needs_context";
  }

  if (rule.requiresAmount && (!input.context.amount || input.context.amount <= 0)) {
    reasons.push("positive_amount_required");
    return "intent_needs_context";
  }

  if (rule.requiresCoinCode && !input.context.coinCode) {
    reasons.push("coin_code_required");
    return "intent_needs_context";
  }

  if (rule.requiresIdempotency && !input.idempotencyKey) {
    reasons.push("idempotency_key_required");
    return "intent_needs_context";
  }

  if (rule.requiresDedupe && !input.dedupeKey) {
    reasons.push("dedupe_key_required");
    return "intent_needs_context";
  }

  if (rule.sensitiveAction && input.context.ageBand === "unknown") {
    reasons.push("unknown_age_requires_policy_verification");
    return "intent_policy_required";
  }

  if (precheckRiskScore > rule.maxPrecheckRiskScore) {
    reasons.push("precheck_risk_above_maximum");
    return precheckRiskScore > 0.7 ? "intent_rejected" : "intent_policy_required";
  }

  if (contextCompletenessScore < rule.minContextCompletenessScore) {
    reasons.push("context_completeness_below_minimum");
    return "intent_needs_context";
  }

  if (intentLegitimacyScore < rule.minIntentLegitimacyScore) {
    reasons.push("intent_legitimacy_below_minimum");
    return "intent_rejected";
  }

  if (routingReadinessScore < rule.minRoutingReadinessScore) {
    reasons.push("routing_readiness_below_minimum");
    return "intent_needs_context";
  }

  if (rule.requiresPolicy && !input.policyRequested) {
    reasons.push("policy_request_required");
    return "intent_policy_required";
  }

  if (rule.requiresSaga && !input.sagaRequested) {
    reasons.push("saga_request_required");
    return "intent_saga_required";
  }

  reasons.push("action_intent_ready");
  return "intent_ready";
}

function createActionIntentAlphabetEvent(params: {
  input: ActionIntentSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "J",
    eventType: params.eventType,
    objectType: "action_intent",
    objectId: params.input.actionIntentId,
    sourceContext: "action_intent",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.context.trustScore ?? null,
    riskScore: params.riskScore,
    ageBand: params.input.context.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      actionIntentId: params.input.actionIntentId,
      intentType: params.input.intentType,
      intentSource: params.input.intentSource,
      userId: params.input.userId,
      actorUserId: params.input.actorUserId ?? null,
      creatorId: params.input.creatorId ?? null,
      businessId: params.input.businessId ?? null,
      walletId: params.input.walletId ?? null,
      contentId: params.input.contentId ?? null,
      campaignId: params.input.campaignId ?? null,
      grantEligibilityId: params.input.grantEligibilityId ?? null,
      sessionId: params.input.sessionId ?? null,
      deviceId: params.input.deviceId ?? null,
      clientRequestId: params.input.clientRequestId ?? null,
      sourceEventIds: params.input.sourceEventIds,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateActionIntent(input: ActionIntentSignalInput): ActionIntentEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const contextCompletenessScore = calculateContextCompletenessScore(input, rule);
  const intentLegitimacyScore = calculateIntentLegitimacyScore(input);
  const precheckRiskScore = calculatePrecheckRiskScore(input);
  const routingReadinessScore = calculateRoutingReadinessScore(input, rule);

  if (!rule) {
    reasons.push("no_active_action_intent_rule");

    const actionIntentCreatedEvent = createActionIntentAlphabetEvent({
      input,
      eventType: "action_intent_created",
      rawScore: contextCompletenessScore,
      qualityScore: routingReadinessScore,
      riskScore: precheckRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    const actionIntentRejectedEvent = createActionIntentAlphabetEvent({
      input,
      eventType: "action_intent_rejected",
      rawScore: contextCompletenessScore,
      qualityScore: routingReadinessScore,
      riskScore: precheckRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons, phase: "rule_lookup" }
    });

    return {
      actionIntentId: input.actionIntentId,
      intentType: input.intentType,
      intentSource: input.intentSource,
      status: "intent_rejected",
      userId: input.userId,
      actorUserId: input.actorUserId ?? null,
      creatorId: input.creatorId ?? null,
      businessId: input.businessId ?? null,
      walletId: input.walletId ?? null,
      contentId: input.contentId ?? null,
      campaignId: input.campaignId ?? null,
      grantEligibilityId: input.grantEligibilityId ?? null,
      contextCompletenessScore,
      intentLegitimacyScore,
      precheckRiskScore,
      routingReadinessScore,
      ready: false,
      needsContext: false,
      duplicate: false,
      policyRequired: false,
      sagaRequired: false,
      rejected: true,
      canceled: false,
      expired: false,
      policyRequest: {
        required: false,
        actionType: mapIntentToPolicyAction(input.intentType),
        primaryDomain: mapIntentToPolicyDomain(input.intentType),
        reasonCodes: reasons
      },
      sagaRequest: {
        required: false,
        sagaType: mapIntentToSagaType(input.intentType),
        reasonCodes: reasons
      },
      dedupeOutput: {
        idempotencyKey: input.idempotencyKey ?? null,
        dedupeKey: input.dedupeKey ?? null,
        duplicateIntentCount: input.duplicateIntentCount,
        shouldBlockDuplicate: input.duplicateIntentCount > 0
      },
      auditRecommended: true,
      notificationRecommended: true,
      reasons,
      actionIntentCreatedEvent,
      actionIntentContextCapturedEvent: null,
      actionIntentPrecheckPassedEvent: null,
      actionIntentPrecheckFailedEvent: actionIntentRejectedEvent,
      actionIntentPolicyRequestedEvent: null,
      actionIntentSagaRequestedEvent: null,
      actionIntentAcceptedEvent: null,
      actionIntentRejectedEvent,
      actionIntentCanceledEvent: null,
      actionIntentExpiredEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideActionIntentOutcome({
    input,
    rule,
    contextCompletenessScore,
    intentLegitimacyScore,
    precheckRiskScore,
    routingReadinessScore,
    reasons
  });

  const ready = status === "intent_ready";
  const needsContext = status === "intent_needs_context";
  const duplicate = status === "intent_duplicate";
  const policyRequired = status === "intent_policy_required";
  const sagaRequired = status === "intent_saga_required";
  const rejected = status === "intent_rejected";
  const canceled = status === "intent_canceled";
  const expired = status === "intent_expired";

  const verificationStatus =
    ready || policyRequired || sagaRequired ? "verified" : "rejected";

  const policyRequest = {
    required: rule.requiresPolicy || policyRequired,
    actionType: mapIntentToPolicyAction(input.intentType),
    primaryDomain: mapIntentToPolicyDomain(input.intentType),
    reasonCodes: reasons
  };

  const sagaRequest = {
    required: rule.requiresSaga || sagaRequired,
    sagaType: mapIntentToSagaType(input.intentType),
    reasonCodes: reasons
  };

  const auditRecommended =
    rule.requiresAudit || rejected || expired || duplicate || precheckRiskScore > 0.35;

  const notificationRecommended =
    rejected || canceled || expired || policyRequired || sagaRequired;

  const actionIntentCreatedEvent = createActionIntentAlphabetEvent({
    input,
    eventType: "action_intent_created",
    rawScore: contextCompletenessScore,
    qualityScore: routingReadinessScore,
    riskScore: precheckRiskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const actionIntentContextCapturedEvent = input.contextCaptured
    ? createActionIntentAlphabetEvent({
        input,
        eventType: "action_intent_context_captured",
        rawScore: contextCompletenessScore,
        qualityScore: routingReadinessScore,
        riskScore: precheckRiskScore,
        verificationStatus,
        metadata: { status, context: input.context, reasons }
      })
    : null;

  const actionIntentPrecheckPassedEvent =
    precheckRiskScore <= rule.maxPrecheckRiskScore && !rejected && !duplicate && !expired && !canceled
      ? createActionIntentAlphabetEvent({
          input,
          eventType: "action_intent_precheck_passed",
          rawScore: intentLegitimacyScore,
          qualityScore: routingReadinessScore,
          riskScore: precheckRiskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const actionIntentPrecheckFailedEvent =
    precheckRiskScore > rule.maxPrecheckRiskScore || rejected || duplicate
      ? createActionIntentAlphabetEvent({
          input,
          eventType: "action_intent_precheck_failed",
          rawScore: intentLegitimacyScore,
          qualityScore: routingReadinessScore,
          riskScore: precheckRiskScore,
          verificationStatus: "rejected",
          metadata: { status, riskSignals: input.riskSignals, reasons }
        })
      : null;

  const actionIntentPolicyRequestedEvent =
    policyRequired || input.policyRequested
      ? createActionIntentAlphabetEvent({
          input,
          eventType: "action_intent_policy_requested",
          rawScore: routingReadinessScore,
          qualityScore: contextCompletenessScore,
          riskScore: precheckRiskScore,
          verificationStatus,
          metadata: {
            status,
            policyRequest: {
              required: policyRequest.required,
              actionType: policyRequest.actionType,
              primaryDomain: policyRequest.primaryDomain,
              reasonCodes: policyRequest.reasonCodes
            },
            reasons
          }
        })
      : null;

  const actionIntentSagaRequestedEvent =
    sagaRequired || input.sagaRequested
      ? createActionIntentAlphabetEvent({
          input,
          eventType: "action_intent_saga_requested",
          rawScore: routingReadinessScore,
          qualityScore: contextCompletenessScore,
          riskScore: precheckRiskScore,
          verificationStatus,
          metadata: {
            status,
            sagaRequest: {
              required: sagaRequest.required,
              sagaType: sagaRequest.sagaType,
              reasonCodes: sagaRequest.reasonCodes
            },
            reasons
          }
        })
      : null;

  const actionIntentAcceptedEvent = ready
    ? createActionIntentAlphabetEvent({
        input,
        eventType: "action_intent_accepted",
        rawScore: intentLegitimacyScore,
        qualityScore: routingReadinessScore,
        riskScore: precheckRiskScore,
        verificationStatus: "verified",
        metadata: { status, reasons }
      })
    : null;

  const actionIntentRejectedEvent =
    rejected || duplicate
      ? createActionIntentAlphabetEvent({
          input,
          eventType: "action_intent_rejected",
          rawScore: intentLegitimacyScore,
          qualityScore: routingReadinessScore,
          riskScore: precheckRiskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const actionIntentCanceledEvent = canceled
    ? createActionIntentAlphabetEvent({
        input,
        eventType: "action_intent_canceled",
        rawScore: intentLegitimacyScore,
        qualityScore: routingReadinessScore,
        riskScore: precheckRiskScore,
        verificationStatus: "rejected",
        metadata: { status, reasons }
      })
    : null;

  const actionIntentExpiredEvent = expired
    ? createActionIntentAlphabetEvent({
        input,
        eventType: "action_intent_expired",
        rawScore: intentLegitimacyScore,
        qualityScore: routingReadinessScore,
        riskScore: precheckRiskScore,
        verificationStatus: "rejected",
        metadata: { status, expiresAt: input.expiresAt ?? null, reasons }
      })
    : null;

  return {
    actionIntentId: input.actionIntentId,
    intentType: input.intentType,
    intentSource: input.intentSource,
    status,
    userId: input.userId,
    actorUserId: input.actorUserId ?? null,
    creatorId: input.creatorId ?? null,
    businessId: input.businessId ?? null,
    walletId: input.walletId ?? null,
    contentId: input.contentId ?? null,
    campaignId: input.campaignId ?? null,
    grantEligibilityId: input.grantEligibilityId ?? null,
    contextCompletenessScore,
    intentLegitimacyScore,
    precheckRiskScore,
    routingReadinessScore,
    ready,
    needsContext,
    duplicate,
    policyRequired,
    sagaRequired,
    rejected,
    canceled,
    expired,
    policyRequest,
    sagaRequest,
    dedupeOutput: {
      idempotencyKey: input.idempotencyKey ?? null,
      dedupeKey: input.dedupeKey ?? null,
      duplicateIntentCount: input.duplicateIntentCount,
      shouldBlockDuplicate: duplicate
    },
    auditRecommended,
    notificationRecommended,
    reasons,
    actionIntentCreatedEvent,
    actionIntentContextCapturedEvent,
    actionIntentPrecheckPassedEvent,
    actionIntentPrecheckFailedEvent,
    actionIntentPolicyRequestedEvent,
    actionIntentSagaRequestedEvent,
    actionIntentAcceptedEvent,
    actionIntentRejectedEvent,
    actionIntentCanceledEvent,
    actionIntentExpiredEvent,
    metadata: {
      ruleIntentType: rule.intentType,
      ...input.metadata
    }
  };
}
