import { CREATOR_PAYOUT_RULES } from "../../data/alphabet/creator-payout-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  CreatorPayoutResult,
  CreatorPayoutRuleSet,
  CreatorPayoutSignalInput,
  CreatorPayoutStatus,
  CreatorSplitRecipient
} from "../../types/alphabet/creator-payout.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: CreatorPayoutSignalInput): CreatorPayoutRuleSet | undefined {
  return CREATOR_PAYOUT_RULES.find(
    (rule) => rule.active && rule.revenueSource === input.revenueSource
  );
}

function calculatePayoutRiskScore(input: CreatorPayoutSignalInput): number {
  let risk =
    clamp(input.copyrightRisk) * 0.16 +
    clamp(input.safetyRisk) * 0.14 +
    clamp(input.fraudRisk) * 0.22 +
    clamp(input.chargebackRisk) * 0.16 +
    clamp(input.refundRisk) * 0.12 +
    clamp(input.payoutVelocityRisk) * 0.1 +
    (input.contentSafetyStatus === "blocked" || input.contentSafetyStatus === "removed" ? 0.1 : 0);

  if (input.creatorAccountLocked) risk += 0.12;
  if (input.payoutLocked) risk += 0.1;
  if (input.recentSeverePenaltyCount > 0) risk += 0.12;
  if (input.disputeStatus !== "none") risk += 0.08;

  return clamp(risk);
}

function calculateRevenueQualityScore(input: CreatorPayoutSignalInput): number {
  return clamp(
    clamp(input.originalityScore) * 0.24 +
      clamp(input.attributionConfidenceScore) * 0.24 +
      clamp(input.contentQualityScore) * 0.2 +
      clamp(input.audienceQualityScore) * 0.12 +
      clamp(input.trustScore / 100) * 0.1 +
      clamp(input.uValueScore / 100) * 0.1
  );
}

function calculateSplitIntegrityScore(input: CreatorPayoutSignalInput): number {
  const splitRateTotal = input.collaborators.reduce(
    (sum, recipient) => sum + recipient.splitRate,
    0
  );

  const splitAmountTotal = input.collaborators.reduce(
    (sum, recipient) => sum + recipient.splitAmount,
    0
  );

  const rateScore = splitRateTotal <= 1 ? 1 : clamp(1 / splitRateTotal);
  const amountScore =
    splitAmountTotal <= input.distributableAmount
      ? 1
      : clamp(input.distributableAmount / Math.max(1, splitAmountTotal));

  const creatorIncluded = input.collaborators.some(
    (recipient) => recipient.recipientUserId === input.userId
  );

  return clamp(rateScore * 0.4 + amountScore * 0.4 + (creatorIncluded ? 0.2 : 0));
}

function calculatePayoutEligibilityScore(input: CreatorPayoutSignalInput): number {
  const revenueQualityScore = calculateRevenueQualityScore(input);
  const splitIntegrityScore = calculateSplitIntegrityScore(input);
  const payoutRiskScore = calculatePayoutRiskScore(input);

  const poolCoverage =
    input.distributableAmount <= 0
      ? 0
      : clamp(input.payoutPoolAvailableAmount / input.distributableAmount);

  const poolHealth = clamp(input.payoutPoolCoverageRatio);

  return clamp(
    revenueQualityScore * 0.28 +
      splitIntegrityScore * 0.18 +
      poolCoverage * 0.18 +
      poolHealth * 0.12 +
      clamp(input.trustScore / 100) * 0.12 +
      clamp(input.uValueScore / 100) * 0.06 +
      (1 - payoutRiskScore) * 0.06
  );
}

function decideCreatorPayoutStatus(params: {
  input: CreatorPayoutSignalInput;
  rule: CreatorPayoutRuleSet;
  payoutEligibilityScore: number;
  revenueQualityScore: number;
  payoutRiskScore: number;
  splitIntegrityScore: number;
  reasons: string[];
}): CreatorPayoutStatus {
  const {
    input,
    rule,
    payoutEligibilityScore,
    revenueQualityScore,
    payoutRiskScore,
    splitIntegrityScore,
    reasons
  } = params;

  if (input.reversalRequested) {
    reasons.push("creator_payout_reversal_requested");
    return "payout_reversed";
  }

  if (input.creatorAccountLocked) {
    reasons.push("creator_account_locked");
    return "payout_rejected";
  }

  if (input.payoutLocked) {
    reasons.push("creator_payout_locked");
    return "payout_pending_hold";
  }

  if (input.grossRevenue < rule.minGrossRevenue) {
    reasons.push("gross_revenue_below_minimum");
    return "payout_rejected";
  }

  if (input.grossRevenue > rule.maxGrossRevenue) {
    reasons.push("gross_revenue_above_maximum");
    return "payout_pending_hold";
  }

  if (input.revenueSource === "manual_adjustment" && !rule.allowManualAdjustment) {
    reasons.push("manual_adjustment_not_allowed");
    return "payout_rejected";
  }

  if (rule.requiresOriginalityVerification && input.originalityScore < 0.5) {
    reasons.push("originality_verification_below_minimum");
    return "payout_pending_hold";
  }

  if (rule.requiresAttribution && input.attributionConfidenceScore < 0.5) {
    reasons.push("attribution_confidence_below_minimum");
    return "payout_pending_hold";
  }

  if (
    input.contentSafetyStatus === "blocked" ||
    input.contentSafetyStatus === "removed"
  ) {
    reasons.push("content_safety_blocked");
    return "payout_rejected";
  }

  if (input.contentSafetyStatus === "pending_review" || input.contentSafetyStatus === "limited") {
    reasons.push("content_safety_requires_review");
    return "payout_pending_hold";
  }

  if (
    input.disputeStatus === "opened" ||
    input.disputeStatus === "under_review" ||
    input.disputeStatus === "chargeback"
  ) {
    reasons.push("creator_payout_disputed");
    return "payout_disputed";
  }

  if (
    input.disputeStatus === "resolved_creator_loses" ||
    input.disputeStatus === "refunded"
  ) {
    reasons.push("creator_dispute_lost_or_refunded");
    return "payout_reversed";
  }

  if (input.recentSeverePenaltyCount > rule.maxRecentSeverePenaltyCount) {
    reasons.push("recent_severe_penalty_blocks_payout");
    return "payout_rejected";
  }

  if (input.recentPenaltyCount > rule.maxRecentPenaltyCount) {
    reasons.push("recent_penalty_count_above_maximum");
    return "payout_pending_hold";
  }

  if (input.trustScore < rule.minTrustScore) {
    reasons.push("trust_score_below_minimum");
    return "payout_pending_hold";
  }

  if (input.uValueScore < rule.minUValueScore) {
    reasons.push("u_value_below_minimum");
    return "payout_pending_hold";
  }

  if (input.copyrightRisk > rule.maxCopyrightRisk) {
    reasons.push("copyright_risk_above_maximum");
    return "payout_pending_hold";
  }

  if (input.safetyRisk > rule.maxSafetyRisk) {
    reasons.push("safety_risk_above_maximum");
    return "payout_pending_hold";
  }

  if (input.fraudRisk > rule.maxFraudRisk) {
    reasons.push("fraud_risk_above_maximum");
    return "payout_suspicious";
  }

  if (input.chargebackRisk > rule.maxChargebackRisk) {
    reasons.push("chargeback_risk_above_maximum");
    return "payout_suspicious";
  }

  if (input.refundRisk > rule.maxRefundRisk) {
    reasons.push("refund_risk_above_maximum");
    return "payout_pending_hold";
  }

  if (input.payoutVelocityRisk > rule.maxPayoutVelocityRisk) {
    reasons.push("payout_velocity_risk_above_maximum");
    return "payout_pending_hold";
  }

  if (payoutRiskScore > rule.maxPayoutRiskScore) {
    reasons.push("payout_risk_score_above_maximum");
    return payoutRiskScore > 0.7 ? "payout_suspicious" : "payout_pending_hold";
  }

  if (revenueQualityScore < rule.minRevenueQualityScore) {
    reasons.push("revenue_quality_below_minimum");
    return "payout_pending_hold";
  }

  if (splitIntegrityScore < rule.minSplitIntegrityScore) {
    reasons.push("split_integrity_below_minimum");
    return "payout_pending_hold";
  }

  if (rule.requiresPayoutPool && input.payoutPoolAvailableAmount < input.distributableAmount) {
    reasons.push("payout_pool_unavailable");
    return "payout_pool_unavailable";
  }

  if (payoutEligibilityScore < rule.minPayoutEligibilityScore) {
    reasons.push("payout_eligibility_below_minimum");
    return "payout_pending_hold";
  }

  if (!input.holdExpired && input.payoutHoldHours > 0) {
    reasons.push("payout_hold_period_active");
    return "payout_pending_hold";
  }

  if (input.completionRequested) {
    reasons.push("creator_payout_completed");
    return "payout_approved";
  }

  reasons.push("creator_payout_approved");
  return "payout_approved";
}

function createCreatorPayoutAlphabetEvent(params: {
  input: CreatorPayoutSignalInput;
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
    coinCode: "I",
    eventType: params.eventType,
    objectType: "creator_payout",
    objectId: params.input.creatorPayoutId,
    sourceContext: "creator",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.trustScore,
    riskScore: params.riskScore,
    ageBand: "18_plus",
    verificationStatus: params.verificationStatus,
    metadata: {
      creatorPayoutId: params.input.creatorPayoutId,
      creatorId: params.input.creatorId,
      walletId: params.input.walletId,
      revenueSource: params.input.revenueSource,
      sourceObjectId: params.input.sourceObjectId ?? null,
      grossRevenue: params.input.grossRevenue,
      platformFeeAmount: params.input.platformFeeAmount,
      taxWithholdingEstimate: params.input.taxWithholdingEstimate,
      creatorNetRevenue: params.input.creatorNetRevenue,
      distributableAmount: params.input.distributableAmount,
      disputeStatus: params.input.disputeStatus,
      contentSafetyStatus: params.input.contentSafetyStatus,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateCreatorPayout(input: CreatorPayoutSignalInput): CreatorPayoutResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const payoutRiskScore = calculatePayoutRiskScore(input);
  const revenueQualityScore = calculateRevenueQualityScore(input);
  const splitIntegrityScore = calculateSplitIntegrityScore(input);
  const payoutEligibilityScore = calculatePayoutEligibilityScore(input);

  if (!rule) {
    reasons.push("no_active_creator_payout_rule");

    const creatorPayoutCreatedEvent = createCreatorPayoutAlphabetEvent({
      input,
      eventType: "creator_payout_created",
      rawScore: 0,
      qualityScore: 0,
      riskScore: payoutRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      creatorPayoutId: input.creatorPayoutId,
      creatorId: input.creatorId,
      userId: input.userId,
      walletId: input.walletId,
      revenueSource: input.revenueSource,
      status: "payout_rejected",
      grossRevenue: input.grossRevenue,
      platformFeeAmount: input.platformFeeAmount,
      taxWithholdingEstimate: input.taxWithholdingEstimate,
      creatorNetRevenue: input.creatorNetRevenue,
      distributableAmount: input.distributableAmount,
      collaboratorSplits: input.collaborators,
      walletCreditAuthorized: false,
      payoutPoolReserved: false,
      holdRequired: false,
      disputeRequired: false,
      reversalRequired: false,
      reviewRecommended: true,
      auditRecommended: true,
      payoutEligibilityScore,
      revenueQualityScore,
      payoutRiskScore,
      splitIntegrityScore,
      reasons,
      creatorPayoutCreatedEvent,
      creatorRevenueAttributedEvent: null,
      creatorPayoutHeldEvent: null,
      creatorPayoutApprovedEvent: null,
      creatorPayoutRejectedEvent: creatorPayoutCreatedEvent,
      creatorPayoutReversedEvent: null,
      creatorPayoutDisputedEvent: null,
      creatorPayoutCompletedEvent: null,
      creatorPayoutFraudDetectedEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideCreatorPayoutStatus({
    input,
    rule,
    payoutEligibilityScore,
    revenueQualityScore,
    payoutRiskScore,
    splitIntegrityScore,
    reasons
  });

  const walletCreditAuthorized =
    status === "payout_approved" &&
    input.distributableAmount > 0 &&
    input.payoutPoolAvailableAmount >= input.distributableAmount;

  const payoutPoolReserved = walletCreditAuthorized;
  const holdRequired = status === "payout_pending_hold";
  const disputeRequired = status === "payout_disputed";
  const reversalRequired = status === "payout_reversed";
  const reviewRecommended =
    holdRequired ||
    disputeRequired ||
    status === "payout_suspicious" ||
    status === "payout_pool_unavailable";

  const auditRecommended =
    walletCreditAuthorized ||
    disputeRequired ||
    reversalRequired ||
    status === "payout_suspicious" ||
    input.grossRevenue >= 5000;

  const verificationStatus =
    status === "payout_approved" ? "verified" : "rejected";

  const creatorPayoutCreatedEvent = createCreatorPayoutAlphabetEvent({
    input,
    eventType: "creator_payout_created",
    rawScore: payoutEligibilityScore,
    qualityScore: revenueQualityScore,
    riskScore: payoutRiskScore,
    verificationStatus,
    metadata: {
      status,
      reasons
    }
  });

  const creatorRevenueAttributedEvent =
    input.attributionConfidenceScore >= 0.5
      ? createCreatorPayoutAlphabetEvent({
          input,
          eventType: "creator_revenue_attributed",
          rawScore: input.grossRevenue,
          qualityScore: input.attributionConfidenceScore,
          riskScore: payoutRiskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  const creatorPayoutHeldEvent =
    status === "payout_pending_hold" || status === "payout_pool_unavailable"
      ? createCreatorPayoutAlphabetEvent({
          input,
          eventType: "creator_payout_held",
          rawScore: payoutEligibilityScore,
          qualityScore: revenueQualityScore,
          riskScore: payoutRiskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            holdRequired,
            reasons
          }
        })
      : null;

  const creatorPayoutApprovedEvent =
    status === "payout_approved"
      ? createCreatorPayoutAlphabetEvent({
          input,
          eventType: "creator_payout_approved",
          rawScore: input.distributableAmount,
          qualityScore: revenueQualityScore,
          riskScore: payoutRiskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            walletCreditAuthorized,
            payoutPoolReserved,
            reasons
          }
        })
      : null;

  const creatorPayoutRejectedEvent =
    status === "payout_rejected"
      ? createCreatorPayoutAlphabetEvent({
          input,
          eventType: "creator_payout_rejected",
          rawScore: payoutEligibilityScore,
          qualityScore: revenueQualityScore,
          riskScore: payoutRiskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  const creatorPayoutReversedEvent =
    status === "payout_reversed"
      ? createCreatorPayoutAlphabetEvent({
          input,
          eventType: "creator_payout_reversed",
          rawScore: input.distributableAmount,
          qualityScore: revenueQualityScore,
          riskScore: payoutRiskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reversalRequired,
            reasons
          }
        })
      : null;

  const creatorPayoutDisputedEvent =
    status === "payout_disputed"
      ? createCreatorPayoutAlphabetEvent({
          input,
          eventType: "creator_payout_disputed",
          rawScore: payoutEligibilityScore,
          qualityScore: revenueQualityScore,
          riskScore: payoutRiskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            disputeRequired,
            reasons
          }
        })
      : null;

  const creatorPayoutCompletedEvent =
    status === "payout_approved" && input.completionRequested
      ? createCreatorPayoutAlphabetEvent({
          input,
          eventType: "creator_payout_completed",
          rawScore: input.distributableAmount,
          qualityScore: revenueQualityScore,
          riskScore: payoutRiskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            walletCreditAuthorized,
            reasons
          }
        })
      : null;

  const creatorPayoutFraudDetectedEvent =
    status === "payout_suspicious"
      ? createCreatorPayoutAlphabetEvent({
          input,
          eventType: "creator_payout_fraud_detected",
          rawScore: 0,
          qualityScore: 0,
          riskScore: payoutRiskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  return {
    creatorPayoutId: input.creatorPayoutId,
    creatorId: input.creatorId,
    userId: input.userId,
    walletId: input.walletId,
    revenueSource: input.revenueSource,
    status,
    grossRevenue: input.grossRevenue,
    platformFeeAmount: input.platformFeeAmount,
    taxWithholdingEstimate: input.taxWithholdingEstimate,
    creatorNetRevenue: input.creatorNetRevenue,
    distributableAmount: input.distributableAmount,
    collaboratorSplits: input.collaborators,
    walletCreditAuthorized,
    payoutPoolReserved,
    holdRequired,
    disputeRequired,
    reversalRequired,
    reviewRecommended,
    auditRecommended,
    payoutEligibilityScore,
    revenueQualityScore,
    payoutRiskScore,
    splitIntegrityScore,
    reasons,
    creatorPayoutCreatedEvent,
    creatorRevenueAttributedEvent,
    creatorPayoutHeldEvent,
    creatorPayoutApprovedEvent,
    creatorPayoutRejectedEvent,
    creatorPayoutReversedEvent,
    creatorPayoutDisputedEvent,
    creatorPayoutCompletedEvent,
    creatorPayoutFraudDetectedEvent,
    metadata: {
      ruleRevenueSource: rule.revenueSource,
      ...input.metadata
    }
  };
}

export function calculateCreatorPayoutAmounts(params: {
  grossRevenue: number;
  platformFeeRate: number;
  taxWithholdingRate?: number;
}): {
  platformFeeAmount: number;
  taxWithholdingEstimate: number;
  creatorNetRevenue: number;
  distributableAmount: number;
} {
  const platformFeeAmount = Number(
    (params.grossRevenue * params.platformFeeRate).toFixed(6)
  );

  const creatorNetRevenue = Number(
    Math.max(0, params.grossRevenue - platformFeeAmount).toFixed(6)
  );

  const taxWithholdingEstimate = Number(
    (creatorNetRevenue * (params.taxWithholdingRate ?? 0)).toFixed(6)
  );

  const distributableAmount = Number(
    Math.max(0, creatorNetRevenue - taxWithholdingEstimate).toFixed(6)
  );

  return {
    platformFeeAmount,
    taxWithholdingEstimate,
    creatorNetRevenue,
    distributableAmount
  };
}

export function calculateCreatorSplits(params: {
  distributableAmount: number;
  recipients: Array<Omit<CreatorSplitRecipient, "splitAmount">>;
}): CreatorSplitRecipient[] {
  return params.recipients.map((recipient) => ({
    ...recipient,
    splitAmount: Number(
      (params.distributableAmount * recipient.splitRate).toFixed(6)
    )
  }));
}
