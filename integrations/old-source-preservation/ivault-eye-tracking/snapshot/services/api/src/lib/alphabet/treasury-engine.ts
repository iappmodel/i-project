import { TREASURY_RULES } from "../../data/alphabet/treasury-rules";
import type { CoinCode } from "../../types/alphabet/coin.types";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  TreasuryEvaluationResult,
  TreasuryRuleSet,
  TreasurySignalInput,
  TreasuryStatus
} from "../../types/alphabet/treasury.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

function findRule(input: TreasurySignalInput): TreasuryRuleSet | undefined {
  return TREASURY_RULES.find(
    (rule) => rule.active && rule.reserveType === input.reserveType
  );
}

function calculateSolvencyScore(input: TreasurySignalInput): number {
  const totalObligations =
    input.pendingObligationBalance +
    input.campaignBudgetCommitments +
    input.liquidityConversionObligations +
    input.withdrawalObligations +
    input.grantObligations +
    input.creatorPayoutObligations +
    input.refundChargebackExposure;

  const obligationCoverage = clamp(
    safeRatio(input.totalReserveBalance + input.expectedInflows, totalObligations)
  );

  const reserveCoverage = clamp(input.reserveCoverageRatio / 2);
  const liquidityCoverage = clamp(input.liquidityCoverageRatio / 2);
  const availableRatio = clamp(
    safeRatio(input.availableBalance, input.totalReserveBalance)
  );
  const economyHealth = clamp(input.economyHealthScore);

  return clamp(
    obligationCoverage * 0.3 +
      reserveCoverage * 0.25 +
      liquidityCoverage * 0.2 +
      availableRatio * 0.15 +
      economyHealth * 0.1
  );
}

function calculateBudgetHealthScore(input: TreasurySignalInput): number {
  const allocationRatio = safeRatio(input.allocatedBalance, input.totalReserveBalance);
  const pendingRatio = safeRatio(
    input.pendingObligationBalance,
    input.totalReserveBalance
  );
  const outflowRatio = safeRatio(input.expectedOutflows, input.totalReserveBalance);
  const availableRatio = safeRatio(input.availableBalance, input.totalReserveBalance);

  return clamp(
    clamp(availableRatio) * 0.35 +
      (1 - clamp(allocationRatio)) * 0.2 +
      (1 - clamp(pendingRatio)) * 0.2 +
      (1 - clamp(outflowRatio)) * 0.15 +
      clamp(input.economyHealthScore) * 0.1
  );
}

function calculateTreasuryRiskScore(input: TreasurySignalInput): number {
  const allocationRatio = safeRatio(input.allocatedBalance, input.totalReserveBalance);
  const pendingRatio = safeRatio(
    input.pendingObligationBalance,
    input.totalReserveBalance
  );
  const outflowRatio = safeRatio(input.expectedOutflows, input.totalReserveBalance);
  const refundExposureRatio = safeRatio(
    input.refundChargebackExposure,
    input.totalReserveBalance
  );

  let risk =
    clamp(input.riskScore) * 0.18 +
    clamp(input.fraudPressureScore) * 0.16 +
    clamp(input.rewardLeakageScore) * 0.16 +
    clamp(input.anomalyScore) * 0.14 +
    clamp(allocationRatio) * 0.1 +
    clamp(pendingRatio) * 0.1 +
    clamp(outflowRatio) * 0.08 +
    clamp(refundExposureRatio) * 0.08;

  if (input.availableBalance < input.requestedAmount) {
    risk += 0.08;
  }

  if (input.reserveCoverageRatio < 1) {
    risk += 0.08;
  }

  if (input.liquidityCoverageRatio < 1) {
    risk += 0.06;
  }

  return clamp(risk);
}

function actionAllowedByReserveType(
  input: TreasurySignalInput,
  rule: TreasuryRuleSet
): boolean {
  switch (input.actionType) {
    case "approve_budget":
      return rule.allowBudgetApproval;
    case "approve_campaign_budget":
      return rule.allowCampaignUse;
    case "approve_grant_fund":
      return rule.allowGrantUse;
    case "allocate_reserve":
    case "release_reserve":
    case "lock_reserve":
    case "unlock_reserve":
      return true;
    case "lock_liquidity":
      return rule.reserveType === "liquidity_pool";
    default:
      return true;
  }
}

function decideTreasuryStatus(params: {
  input: TreasurySignalInput;
  rule: TreasuryRuleSet;
  solvencyScore: number;
  budgetHealthScore: number;
  treasuryRiskScore: number;
  reasons: string[];
}): TreasuryStatus {
  const { input, rule, solvencyScore, budgetHealthScore, treasuryRiskScore, reasons } =
    params;

  const allocationRatio = safeRatio(input.allocatedBalance, input.totalReserveBalance);
  const pendingRatio = safeRatio(
    input.pendingObligationBalance,
    input.totalReserveBalance
  );
  const outflowRatio = safeRatio(input.expectedOutflows, input.totalReserveBalance);
  const refundExposureRatio = safeRatio(
    input.refundChargebackExposure,
    input.totalReserveBalance
  );

  if (!actionAllowedByReserveType(input, rule)) {
    reasons.push("action_not_allowed_for_reserve_type");
    return "budget_blocked";
  }

  if (input.totalReserveBalance <= 0) {
    reasons.push("reserve_balance_empty");
    return "critical";
  }

  if (input.availableBalance < input.requestedAmount && input.requestedAmount > 0) {
    reasons.push("requested_amount_exceeds_available_reserve");
    return "budget_blocked";
  }

  if (input.reserveCoverageRatio < rule.minReserveCoverageRatio) {
    reasons.push("reserve_coverage_below_minimum");
  }

  if (input.liquidityCoverageRatio < rule.minLiquidityCoverageRatio) {
    reasons.push("liquidity_coverage_below_minimum");
  }

  if (solvencyScore < rule.minSolvencyScore) {
    reasons.push("solvency_score_below_minimum");
  }

  if (budgetHealthScore < rule.minBudgetHealthScore) {
    reasons.push("budget_health_below_minimum");
  }

  if (treasuryRiskScore > rule.maxTreasuryRiskScore) {
    reasons.push("treasury_risk_above_maximum");
  }

  if (input.fraudPressureScore > rule.maxFraudPressureScore) {
    reasons.push("fraud_pressure_above_maximum");
  }

  if (input.rewardLeakageScore > rule.maxRewardLeakageScore) {
    reasons.push("reward_leakage_above_maximum");
  }

  if (input.anomalyScore > rule.maxAnomalyScore) {
    reasons.push("anomaly_score_above_maximum");
  }

  if (allocationRatio > rule.maxAllocationRatio) {
    reasons.push("allocation_ratio_above_maximum");
  }

  if (pendingRatio > rule.maxPendingObligationRatio) {
    reasons.push("pending_obligation_ratio_above_maximum");
  }

  if (outflowRatio > rule.maxExpectedOutflowRatio) {
    reasons.push("expected_outflow_ratio_above_maximum");
  }

  if (refundExposureRatio > rule.maxRefundChargebackExposureRatio) {
    reasons.push("refund_chargeback_exposure_above_maximum");
  }

  if (
    input.actionType === "lock_reserve" ||
    input.actionType === "reject_budget" ||
    input.actionType === "reject_campaign_budget" ||
    input.actionType === "reject_grant_fund"
  ) {
    reasons.push("manual_or_system_block_action");
    return input.actionType === "lock_reserve" ? "reserve_locked" : "budget_blocked";
  }

  if (input.actionType === "lock_liquidity") {
    reasons.push("liquidity_lock_requested");
    return "liquidity_blocked";
  }

  if (
    solvencyScore < 0.35 ||
    budgetHealthScore < 0.35 ||
    treasuryRiskScore > 0.75 ||
    input.reserveCoverageRatio < 0.75
  ) {
    reasons.push("critical_treasury_condition");
    return "critical";
  }

  if (
    solvencyScore < 0.5 ||
    budgetHealthScore < 0.5 ||
    treasuryRiskScore > 0.55 ||
    input.reserveCoverageRatio < 1 ||
    input.liquidityCoverageRatio < 1
  ) {
    reasons.push("treasury_constrained");
    return "constrained";
  }

  if (reasons.length > 0) {
    reasons.push("treasury_watch");
    return "watch";
  }

  reasons.push("treasury_healthy");
  return "healthy";
}

function createTreasuryAlphabetEvent(params: {
  input: TreasurySignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: "system",
    coinCode: params.input.coinCode as CoinCode,
    eventType: params.eventType,
    objectType: "treasury_account",
    objectId: params.input.treasuryAccountId,
    sourceContext: "treasury",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.trustScore,
    riskScore: params.riskScore,
    ageBand: "unknown",
    verificationStatus: params.verificationStatus,
    metadata: {
      treasuryAccountId: params.input.treasuryAccountId,
      reserveType: params.input.reserveType,
      coinCode: params.input.coinCode,
      currencyCode: params.input.currencyCode,
      actionType: params.input.actionType,
      requestedAmount: params.input.requestedAmount,
      campaignId: params.input.campaignId ?? null,
      grantId: params.input.grantId ?? null,
      businessId: params.input.businessId ?? null,
      creatorId: params.input.creatorId ?? null,
      budgetOwnerId: params.input.budgetOwnerId ?? null,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateTreasuryAction(
  input: TreasurySignalInput
): TreasuryEvaluationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const solvencyScore = calculateSolvencyScore(input);
  const budgetHealthScore = calculateBudgetHealthScore(input);
  const treasuryRiskScore = calculateTreasuryRiskScore(input);

  if (!rule) {
    reasons.push("no_active_treasury_rule");

    const treasurySnapshotCreatedEvent = createTreasuryAlphabetEvent({
      input,
      eventType: "treasury_snapshot_created",
      rawScore: solvencyScore,
      qualityScore: budgetHealthScore,
      riskScore: treasuryRiskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      treasuryAccountId: input.treasuryAccountId,
      reserveType: input.reserveType,
      coinCode: input.coinCode,
      currencyCode: input.currencyCode,
      status: "critical",
      requestedAmount: input.requestedAmount,
      approvedAmount: 0,
      rejectedAmount: input.requestedAmount,
      reservedAmount: 0,
      releasedAmount: 0,
      reserveCoverageRatio: input.reserveCoverageRatio,
      liquidityCoverageRatio: input.liquidityCoverageRatio,
      solvencyScore,
      budgetHealthScore,
      treasuryRiskScore,
      budgetApproved: false,
      budgetRejected: true,
      reserveAllocated: false,
      reserveReleased: false,
      reserveLocked: true,
      liquidityLocked: true,
      reviewRecommended: true,
      auditRecommended: true,
      reasons,
      treasurySnapshotCreatedEvent,
      reserveAllocatedEvent: null,
      reserveReleasedEvent: null,
      budgetApprovedEvent: null,
      budgetRejectedEvent: null,
      liquidityPoolLockedEvent: null,
      treasuryRiskDetectedEvent: treasurySnapshotCreatedEvent,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideTreasuryStatus({
    input,
    rule,
    solvencyScore,
    budgetHealthScore,
    treasuryRiskScore,
    reasons
  });

  const budgetApproved =
    (input.actionType === "approve_budget" ||
      input.actionType === "approve_campaign_budget" ||
      input.actionType === "approve_grant_fund") &&
    (status === "healthy" || status === "watch");

  const budgetRejected =
    status === "budget_blocked" ||
    status === "critical" ||
    input.actionType === "reject_budget" ||
    input.actionType === "reject_campaign_budget" ||
    input.actionType === "reject_grant_fund";

  const reserveAllocated =
    input.actionType === "allocate_reserve" &&
    (status === "healthy" || status === "watch" || status === "constrained");

  const reserveReleased = input.actionType === "release_reserve" && status !== "critical";

  const reserveLocked = status === "reserve_locked" || status === "critical";

  const liquidityLocked =
    status === "liquidity_blocked" ||
    (input.reserveType === "liquidity_pool" &&
      (status === "constrained" || status === "critical"));

  const reviewRecommended =
    status === "watch" ||
    status === "constrained" ||
    status === "reserve_locked" ||
    status === "budget_blocked" ||
    status === "liquidity_blocked" ||
    status === "critical" ||
    input.requestedAmount >= rule.requiresReviewAboveAmount;

  const auditRecommended =
    status === "critical" ||
    input.requestedAmount >= rule.requiresAuditAboveAmount ||
    treasuryRiskScore > rule.maxTreasuryRiskScore;

  const approvedAmount = budgetApproved || reserveAllocated ? input.requestedAmount : 0;
  const rejectedAmount = budgetRejected ? input.requestedAmount : 0;
  const reservedAmount = reserveAllocated || budgetApproved ? input.requestedAmount : 0;
  const releasedAmount = reserveReleased ? input.requestedAmount : 0;

  const verificationStatus =
    status === "healthy" || status === "watch" || status === "constrained"
      ? "verified"
      : "rejected";

  const treasurySnapshotCreatedEvent = createTreasuryAlphabetEvent({
    input,
    eventType: "treasury_snapshot_created",
    rawScore: solvencyScore,
    qualityScore: budgetHealthScore,
    riskScore: treasuryRiskScore,
    verificationStatus,
    metadata: {
      status,
      reasons,
      reserveCoverageRatio: input.reserveCoverageRatio,
      liquidityCoverageRatio: input.liquidityCoverageRatio,
      solvencyScore,
      budgetHealthScore,
      treasuryRiskScore
    }
  });

  const reserveAllocatedEvent =
    reserveAllocated || budgetApproved
      ? createTreasuryAlphabetEvent({
          input,
          eventType: "reserve_allocated",
          rawScore: input.requestedAmount,
          qualityScore: budgetHealthScore,
          riskScore: treasuryRiskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            reservedAmount,
            reasons
          }
        })
      : null;

  const reserveReleasedEvent = reserveReleased
    ? createTreasuryAlphabetEvent({
        input,
        eventType: "reserve_released",
        rawScore: releasedAmount,
        qualityScore: budgetHealthScore,
        riskScore: treasuryRiskScore,
        verificationStatus: "verified",
        metadata: {
          status,
          releasedAmount,
          reasons
        }
      })
    : null;

  const budgetApprovedEvent = budgetApproved
    ? createTreasuryAlphabetEvent({
        input,
        eventType: "budget_approved",
        rawScore: approvedAmount,
        qualityScore: solvencyScore,
        riskScore: treasuryRiskScore,
        verificationStatus: "verified",
        metadata: {
          status,
          approvedAmount,
          reasons
        }
      })
    : null;

  const budgetRejectedEvent = budgetRejected
    ? createTreasuryAlphabetEvent({
        input,
        eventType: "budget_rejected",
        rawScore: rejectedAmount,
        qualityScore: budgetHealthScore,
        riskScore: treasuryRiskScore,
        verificationStatus: "rejected",
        metadata: {
          status,
          rejectedAmount,
          reasons
        }
      })
    : null;

  const liquidityPoolLockedEvent = liquidityLocked
    ? createTreasuryAlphabetEvent({
        input,
        eventType: "liquidity_pool_locked",
        rawScore: input.liquidityCoverageRatio,
        qualityScore: solvencyScore,
        riskScore: treasuryRiskScore,
        verificationStatus: "rejected",
        metadata: {
          status,
          reasons
        }
      })
    : null;

  const treasuryRiskDetectedEvent =
    status === "constrained" ||
    status === "reserve_locked" ||
    status === "budget_blocked" ||
    status === "liquidity_blocked" ||
    status === "critical" ||
    treasuryRiskScore > rule.maxTreasuryRiskScore ||
    input.fraudPressureScore > rule.maxFraudPressureScore ||
    input.rewardLeakageScore > rule.maxRewardLeakageScore ||
    input.anomalyScore > rule.maxAnomalyScore
      ? createTreasuryAlphabetEvent({
          input,
          eventType: "treasury_risk_detected",
          rawScore: treasuryRiskScore,
          qualityScore: solvencyScore,
          riskScore: treasuryRiskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  return {
    treasuryAccountId: input.treasuryAccountId,
    reserveType: input.reserveType,
    coinCode: input.coinCode,
    currencyCode: input.currencyCode,
    status,
    requestedAmount: input.requestedAmount,
    approvedAmount,
    rejectedAmount,
    reservedAmount,
    releasedAmount,
    reserveCoverageRatio: input.reserveCoverageRatio,
    liquidityCoverageRatio: input.liquidityCoverageRatio,
    solvencyScore,
    budgetHealthScore,
    treasuryRiskScore,
    budgetApproved,
    budgetRejected,
    reserveAllocated,
    reserveReleased,
    reserveLocked,
    liquidityLocked,
    reviewRecommended,
    auditRecommended,
    reasons,
    treasurySnapshotCreatedEvent,
    reserveAllocatedEvent,
    reserveReleasedEvent,
    budgetApprovedEvent,
    budgetRejectedEvent,
    liquidityPoolLockedEvent,
    treasuryRiskDetectedEvent,
    metadata: {
      ruleReserveType: rule.reserveType,
      ...input.metadata
    }
  };
}
