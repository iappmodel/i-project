import { CAMPAIGN_LIFECYCLE_RULES } from "../../data/alphabet/campaign-lifecycle-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  CampaignDecisionStatus,
  CampaignLifecycleResult,
  CampaignLifecycleRuleSet,
  CampaignLifecycleSignalInput,
  CampaignRewardType
} from "../../types/alphabet/campaign-lifecycle.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function findRule(input: CampaignLifecycleSignalInput): CampaignLifecycleRuleSet | undefined {
  return CAMPAIGN_LIFECYCLE_RULES.find(
    (rule) => rule.active && rule.objective === input.objective
  );
}

function rewardTypeAllowed(rule: CampaignLifecycleRuleSet, rewardType: CampaignRewardType): boolean {
  switch (rewardType) {
    case "spendable":
      return rule.allowSpendableRewards;
    case "pending":
      return rule.allowPendingRewards;
    case "score":
      return rule.allowScoreRewards;
    case "identity":
      return rule.allowIdentityRewards;
    case "access":
      return rule.allowAccessRewards;
    default:
      return false;
  }
}

function calculateBudgetHealthScore(input: CampaignLifecycleSignalInput): number {
  const reserveCoverage = clamp(safeRatio(input.reservedBudget, input.approvedBudget));
  const remainingCoverage = clamp(safeRatio(input.remainingBudget, input.reservedBudget));
  const spendControl = 1 - clamp(safeRatio(input.spentBudget, input.reservedBudget));
  const dailyCapHealth = 1 - clamp(safeRatio(input.dailySpentAmount, input.dailyRewardCap));

  return clamp(
    reserveCoverage * 0.3 +
      remainingCoverage * 0.3 +
      spendControl * 0.2 +
      dailyCapHealth * 0.2
  );
}

function calculateCampaignRiskScore(input: CampaignLifecycleSignalInput): number {
  let risk =
    clamp(input.riskScore) * 0.25 +
    clamp(input.fraudRate) * 0.25 +
    clamp(input.suspiciousRate) * 0.18 +
    (1 - clamp(input.verificationPassRate)) * 0.12 +
    (1 - clamp(input.completionRate)) * 0.08 +
    (input.businessTrustScore < 50 ? 0.08 : 0) +
    (input.trustScore < 40 ? 0.04 : 0);

  if (input.policyBlocked) risk += 0.15;
  if (input.treasuryBudgetRejected) risk += 0.12;

  return clamp(risk);
}

function calculateCampaignReadinessScore(input: CampaignLifecycleSignalInput): number {
  const policyScore = input.policyAllowed && !input.policyBlocked ? 1 : input.policyRequiresReview ? 0.45 : 0;
  const treasuryScore =
    input.treasuryBudgetApproved && input.treasuryReserveAllocated
      ? 1
      : input.treasuryBudgetRejected
        ? 0
        : 0.45;

  const budgetHealthScore = calculateBudgetHealthScore(input);
  const riskScore = calculateCampaignRiskScore(input);

  const timeScore =
    input.campaignStartReached && !input.campaignEndReached
      ? 1
      : !input.campaignStartReached
        ? 0.65
        : 0;

  return clamp(
    policyScore * 0.25 +
      treasuryScore * 0.25 +
      budgetHealthScore * 0.2 +
      timeScore * 0.15 +
      (1 - riskScore) * 0.15
  );
}

function calculateRewardIssuanceEligibilityScore(
  input: CampaignLifecycleSignalInput
): number {
  const activeScore = input.currentStatus === "active" ? 1 : 0;
  const budgetScore =
    input.remainingBudget >= input.requestedRewardAmount &&
    input.reservedBudget > 0
      ? 1
      : 0;

  const userCapScore =
    input.userRewardedAmountSoFar + input.requestedRewardAmount <= input.maxRewardPerUser
      ? 1
      : 0;

  const dailyCapScore =
    input.dailySpentAmount + input.requestedRewardAmount <= input.dailyRewardCap
      ? 1
      : 0;

  const participantCapScore =
    input.participantCount < input.totalParticipantCap
      ? 1
      : 0;

  const verificationScore =
    !input.actionVerificationRequired || input.actionVerified ? 1 : 0;

  const riskScore = calculateCampaignRiskScore(input);

  return clamp(
    activeScore * 0.2 +
      budgetScore * 0.2 +
      userCapScore * 0.15 +
      dailyCapScore * 0.15 +
      participantCapScore * 0.1 +
      verificationScore * 0.1 +
      (1 - riskScore) * 0.1
  );
}

function decideCampaignStatus(params: {
  input: CampaignLifecycleSignalInput;
  rule: CampaignLifecycleRuleSet;
  campaignReadinessScore: number;
  budgetHealthScore: number;
  campaignRiskScore: number;
  rewardIssuanceEligibilityScore: number;
  reasons: string[];
}): CampaignDecisionStatus {
  const {
    input,
    rule,
    campaignReadinessScore,
    budgetHealthScore,
    campaignRiskScore,
    rewardIssuanceEligibilityScore,
    reasons
  } = params;

  if (input.suspendRequested) {
    reasons.push("campaign_suspend_requested");
    return "campaign_suspended";
  }

  if (input.pauseRequested) {
    reasons.push("campaign_pause_requested");
    return "campaign_paused";
  }

  if (input.completeRequested || input.campaignEndReached) {
    reasons.push("campaign_completion_requested_or_ended");
    return "campaign_completed";
  }

  if (input.refundRequested) {
    reasons.push("campaign_refund_requested");
    return input.remainingBudget > 0 ? "campaign_completed" : "campaign_exhausted";
  }

  if (input.requestedBudget < rule.minRequestedBudget) {
    reasons.push("requested_budget_below_minimum");
    return "campaign_rejected";
  }

  if (input.requestedBudget > rule.maxRequestedBudget) {
    reasons.push("requested_budget_above_maximum");
    return "campaign_rejected";
  }

  if (!rewardTypeAllowed(rule, input.rewardType)) {
    reasons.push("reward_type_not_allowed_for_campaign_objective");
    return "campaign_rejected";
  }

  if (input.policyBlocked) {
    reasons.push("policy_blocked_campaign");
    return "campaign_rejected";
  }

  if (rule.requiresPolicyAllow && !input.policyAllowed) {
    reasons.push("policy_allow_required");
    return input.policyRequiresReview ? "campaign_policy_pending" : "campaign_rejected";
  }

  if (input.treasuryBudgetRejected) {
    reasons.push("treasury_rejected_campaign_budget");
    return "campaign_rejected";
  }

  if (
    rule.requiresTreasuryReserve &&
    (!input.treasuryBudgetApproved || !input.treasuryReserveAllocated)
  ) {
    reasons.push("treasury_budget_reserve_required");
    return "campaign_treasury_pending";
  }

  if (input.fraudRate > rule.maxFraudRate) {
    reasons.push("fraud_rate_above_maximum");
    return "campaign_suspended";
  }

  if (input.suspiciousRate > rule.maxSuspiciousRate) {
    reasons.push("suspicious_rate_above_maximum");
    return "campaign_paused";
  }

  if (campaignRiskScore > rule.maxCampaignRiskScore) {
    reasons.push("campaign_risk_score_above_maximum");
    return campaignRiskScore > 0.7 ? "campaign_suspended" : "campaign_paused";
  }

  if (input.reservedBudget <= 0) {
    reasons.push("reserved_budget_missing");
    return "campaign_treasury_pending";
  }

  if (input.remainingBudget <= 0) {
    reasons.push("campaign_budget_exhausted");
    return "campaign_exhausted";
  }

  if (input.participantCount >= input.totalParticipantCap) {
    reasons.push("participant_cap_reached");
    return "campaign_completed";
  }

  if (budgetHealthScore < rule.minBudgetHealthScore) {
    reasons.push("budget_health_below_minimum");
    return "campaign_paused";
  }

  if (campaignReadinessScore < rule.minCampaignReadinessScore) {
    reasons.push("campaign_readiness_below_minimum");
    return "campaign_policy_pending";
  }

  if (
    input.currentStatus === "draft" ||
    input.currentStatus === "policy_pending" ||
    input.currentStatus === "treasury_pending"
  ) {
    reasons.push("campaign_approved");
    return "campaign_approved";
  }

  if (
    input.currentStatus === "approved" ||
    input.currentStatus === "paused" ||
    input.currentStatus === "active"
  ) {
    if (!input.campaignStartReached) {
      reasons.push("campaign_approved_waiting_for_start");
      return "campaign_approved";
    }

    if (rewardIssuanceEligibilityScore < rule.minRewardIssuanceEligibilityScore) {
      reasons.push("reward_issuance_eligibility_below_minimum");
      return input.currentStatus === "active" ? "campaign_active" : "campaign_approved";
    }

    reasons.push("campaign_active");
    return "campaign_active";
  }

  reasons.push("campaign_draft");
  return "campaign_draft";
}

function createCampaignAlphabetEvent(params: {
  input: CampaignLifecycleSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.ownerUserId,
    coinCode: params.input.rewardCoinCode,
    eventType: params.eventType,
    objectType: "campaign",
    objectId: params.input.campaignId,
    sourceContext: "campaign",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.businessTrustScore,
    riskScore: params.riskScore,
    ageBand: "18_plus",
    verificationStatus: params.verificationStatus,
    metadata: {
      campaignLifecycleId: params.input.campaignLifecycleId,
      campaignId: params.input.campaignId,
      businessId: params.input.businessId,
      ownerUserId: params.input.ownerUserId,
      objective: params.input.objective,
      currentStatus: params.input.currentStatus,
      rewardCoinCode: params.input.rewardCoinCode,
      rewardType: params.input.rewardType,
      actionType: params.input.actionType,
      requestedBudget: params.input.requestedBudget,
      approvedBudget: params.input.approvedBudget,
      reservedBudget: params.input.reservedBudget,
      spentBudget: params.input.spentBudget,
      remainingBudget: params.input.remainingBudget,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateCampaignLifecycle(
  input: CampaignLifecycleSignalInput
): CampaignLifecycleResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const campaignReadinessScore = rule ? calculateCampaignReadinessScore(input) : 0;
  const budgetHealthScore = rule ? calculateBudgetHealthScore(input) : 0;
  const campaignRiskScore = calculateCampaignRiskScore(input);
  const rewardIssuanceEligibilityScore = rule
    ? calculateRewardIssuanceEligibilityScore(input)
    : 0;

  if (!rule) {
    reasons.push("no_active_campaign_lifecycle_rule");

    const campaignCreatedEvent = createCampaignAlphabetEvent({
      input,
      eventType: "campaign_created",
      rawScore: 0,
      qualityScore: 0,
      riskScore: campaignRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      campaignLifecycleId: input.campaignLifecycleId,
      campaignId: input.campaignId,
      businessId: input.businessId,
      ownerUserId: input.ownerUserId,
      status: "campaign_rejected",
      rewardCoinCode: input.rewardCoinCode,
      rewardType: input.rewardType,
      requestedRewardAmount: input.requestedRewardAmount,
      authorizedRewardAmount: 0,
      reservedBudget: input.reservedBudget,
      spentBudget: input.spentBudget,
      remainingBudget: input.remainingBudget,
      refundableBudget: Math.max(0, input.remainingBudget),
      campaignReadinessScore,
      budgetHealthScore,
      campaignRiskScore,
      rewardIssuanceEligibilityScore,
      rewardAuthorized: false,
      budgetShouldDecrement: false,
      shouldPause: false,
      shouldSuspend: false,
      shouldRefund: false,
      shouldComplete: false,
      reviewRecommended: true,
      auditRecommended: true,
      reasons,
      campaignCreatedEvent,
      campaignPolicyCheckedEvent: null,
      campaignBudgetReservedEvent: null,
      campaignApprovedEvent: null,
      campaignActivatedEvent: null,
      campaignPausedEvent: null,
      campaignExhaustedEvent: null,
      campaignCompletedEvent: null,
      campaignRejectedEvent: campaignCreatedEvent,
      campaignRefundedEvent: null,
      campaignRewardAuthorizedEvent: null,
      campaignRiskDetectedEvent: campaignCreatedEvent,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideCampaignStatus({
    input,
    rule,
    campaignReadinessScore,
    budgetHealthScore,
    campaignRiskScore,
    rewardIssuanceEligibilityScore,
    reasons
  });

  const rewardAuthorized =
    status === "campaign_active" &&
    rewardIssuanceEligibilityScore >= rule.minRewardIssuanceEligibilityScore &&
    input.remainingBudget >= input.requestedRewardAmount &&
    input.requestedRewardAmount > 0 &&
    (!rule.requiresActionVerification || input.actionVerified);

  const authorizedRewardAmount = rewardAuthorized ? input.requestedRewardAmount : 0;

  const budgetShouldDecrement = rewardAuthorized;
  const shouldPause = status === "campaign_paused";
  const shouldSuspend = status === "campaign_suspended";
  const shouldComplete = status === "campaign_completed";
  const shouldRefund = input.refundRequested && input.remainingBudget > 0;
  const refundableBudget = shouldRefund ? Math.max(0, input.remainingBudget) : 0;

  const reviewRecommended =
    status === "campaign_policy_pending" ||
    status === "campaign_paused" ||
    status === "campaign_suspended" ||
    campaignRiskScore > rule.maxCampaignRiskScore ||
    input.policyRequiresReview;

  const auditRecommended =
    status === "campaign_suspended" ||
    status === "campaign_rejected" ||
    rewardAuthorized ||
    shouldRefund;

  const verificationStatus =
    status === "campaign_approved" ||
    status === "campaign_active" ||
    status === "campaign_completed"
      ? "verified"
      : "rejected";

  const campaignCreatedEvent = createCampaignAlphabetEvent({
    input,
    eventType: "campaign_created",
    rawScore: campaignReadinessScore,
    qualityScore: budgetHealthScore,
    riskScore: campaignRiskScore,
    verificationStatus,
    metadata: {
      status,
      reasons
    }
  });

  const campaignPolicyCheckedEvent = createCampaignAlphabetEvent({
    input,
    eventType: "campaign_policy_checked",
    rawScore: input.policyAllowed ? 1 : 0,
    qualityScore: campaignReadinessScore,
    riskScore: campaignRiskScore,
    verificationStatus: input.policyAllowed ? "verified" : "rejected",
    metadata: {
      policyAllowed: input.policyAllowed,
      policyRequiresReview: input.policyRequiresReview,
      policyBlocked: input.policyBlocked,
      reasons
    }
  });

  const campaignBudgetReservedEvent =
    input.treasuryBudgetApproved && input.treasuryReserveAllocated
      ? createCampaignAlphabetEvent({
          input,
          eventType: "campaign_budget_reserved",
          rawScore: input.reservedBudget,
          qualityScore: budgetHealthScore,
          riskScore: campaignRiskScore,
          verificationStatus: "verified",
          metadata: {
            reservedBudget: input.reservedBudget,
            remainingBudget: input.remainingBudget,
            reasons
          }
        })
      : null;

  const campaignApprovedEvent =
    status === "campaign_approved"
      ? createCampaignAlphabetEvent({
          input,
          eventType: "campaign_approved",
          rawScore: campaignReadinessScore,
          qualityScore: budgetHealthScore,
          riskScore: campaignRiskScore,
          verificationStatus: "verified",
          metadata: { reasons }
        })
      : null;

  const campaignActivatedEvent =
    status === "campaign_active"
      ? createCampaignAlphabetEvent({
          input,
          eventType: "campaign_activated",
          rawScore: campaignReadinessScore,
          qualityScore: rewardIssuanceEligibilityScore,
          riskScore: campaignRiskScore,
          verificationStatus: "verified",
          metadata: { reasons }
        })
      : null;

  const campaignPausedEvent =
    status === "campaign_paused"
      ? createCampaignAlphabetEvent({
          input,
          eventType: "campaign_paused",
          rawScore: campaignReadinessScore,
          qualityScore: budgetHealthScore,
          riskScore: campaignRiskScore,
          verificationStatus: "rejected",
          metadata: { reasons }
        })
      : null;

  const campaignExhaustedEvent =
    status === "campaign_exhausted"
      ? createCampaignAlphabetEvent({
          input,
          eventType: "campaign_exhausted",
          rawScore: 0,
          qualityScore: budgetHealthScore,
          riskScore: campaignRiskScore,
          verificationStatus: "verified",
          metadata: { reasons }
        })
      : null;

  const campaignCompletedEvent =
    status === "campaign_completed"
      ? createCampaignAlphabetEvent({
          input,
          eventType: "campaign_completed",
          rawScore: input.completionRate,
          qualityScore: campaignReadinessScore,
          riskScore: campaignRiskScore,
          verificationStatus: "verified",
          metadata: { reasons }
        })
      : null;

  const campaignRejectedEvent =
    status === "campaign_rejected"
      ? createCampaignAlphabetEvent({
          input,
          eventType: "campaign_rejected",
          rawScore: campaignReadinessScore,
          qualityScore: budgetHealthScore,
          riskScore: campaignRiskScore,
          verificationStatus: "rejected",
          metadata: { reasons }
        })
      : null;

  const campaignRefundedEvent =
    shouldRefund
      ? createCampaignAlphabetEvent({
          input,
          eventType: "campaign_refunded",
          rawScore: refundableBudget,
          qualityScore: budgetHealthScore,
          riskScore: campaignRiskScore,
          verificationStatus: "verified",
          metadata: {
            refundableBudget,
            reasons
          }
        })
      : null;

  const campaignRewardAuthorizedEvent =
    rewardAuthorized
      ? createCampaignAlphabetEvent({
          input,
          eventType: "campaign_reward_authorized",
          rawScore: authorizedRewardAmount,
          qualityScore: rewardIssuanceEligibilityScore,
          riskScore: campaignRiskScore,
          verificationStatus: "verified",
          metadata: {
            authorizedRewardAmount,
            budgetShouldDecrement,
            reasons
          }
        })
      : null;

  const campaignRiskDetectedEvent =
    status === "campaign_paused" ||
    status === "campaign_suspended" ||
    campaignRiskScore > rule.maxCampaignRiskScore
      ? createCampaignAlphabetEvent({
          input,
          eventType: "campaign_risk_detected",
          rawScore: campaignRiskScore,
          qualityScore: campaignReadinessScore,
          riskScore: campaignRiskScore,
          verificationStatus: "rejected",
          metadata: { reasons }
        })
      : null;

  return {
    campaignLifecycleId: input.campaignLifecycleId,
    campaignId: input.campaignId,
    businessId: input.businessId,
    ownerUserId: input.ownerUserId,
    status,
    rewardCoinCode: input.rewardCoinCode,
    rewardType: input.rewardType,
    requestedRewardAmount: input.requestedRewardAmount,
    authorizedRewardAmount,
    reservedBudget: input.reservedBudget,
    spentBudget: input.spentBudget,
    remainingBudget: input.remainingBudget,
    refundableBudget,
    campaignReadinessScore,
    budgetHealthScore,
    campaignRiskScore,
    rewardIssuanceEligibilityScore,
    rewardAuthorized,
    budgetShouldDecrement,
    shouldPause,
    shouldSuspend,
    shouldRefund,
    shouldComplete,
    reviewRecommended,
    auditRecommended,
    reasons,
    campaignCreatedEvent,
    campaignPolicyCheckedEvent,
    campaignBudgetReservedEvent,
    campaignApprovedEvent,
    campaignActivatedEvent,
    campaignPausedEvent,
    campaignExhaustedEvent,
    campaignCompletedEvent,
    campaignRejectedEvent,
    campaignRefundedEvent,
    campaignRewardAuthorizedEvent,
    campaignRiskDetectedEvent,
    metadata: {
      ruleObjective: rule.objective,
      ...input.metadata
    }
  };
}
