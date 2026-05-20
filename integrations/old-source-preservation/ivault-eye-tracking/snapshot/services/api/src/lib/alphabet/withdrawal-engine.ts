import { WITHDRAWAL_RULES } from "../../data/alphabet/withdrawal-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  WithdrawalRuleSet,
  WithdrawalSignalInput,
  WithdrawalStatus,
  WithdrawalVerificationResult
} from "../../types/alphabet/withdrawal.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: WithdrawalSignalInput): WithdrawalRuleSet | undefined {
  return WITHDRAWAL_RULES.find(
    (rule) => rule.active && rule.payoutMethod === input.payoutMethod
  );
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateFeeAmount(input: WithdrawalSignalInput, rule: WithdrawalRuleSet): number {
  return Number((input.requestedAmount * rule.feeRate + rule.flatFee).toFixed(6));
}

function calculatePayoutAmount(input: WithdrawalSignalInput, rule: WithdrawalRuleSet): number {
  return Number(Math.max(0, input.requestedAmount - calculateFeeAmount(input, rule)).toFixed(6));
}

function calculateComplianceScore(input: WithdrawalSignalInput): number {
  const kycScore =
    input.kycStatus === "verified" || input.kycStatus === "not_required"
      ? 1
      : input.kycStatus === "pending"
        ? 0.5
        : 0;

  const taxScore =
    input.taxProfileStatus === "verified" || input.taxProfileStatus === "not_required"
      ? 1
      : input.taxProfileStatus === "pending"
        ? 0.5
        : 0;

  const complianceScore =
    input.complianceStatus === "clear"
      ? 1
      : input.complianceStatus === "pending_review" ||
          input.complianceStatus === "manual_review_required"
        ? 0.45
        : 0;

  const paymentScore =
    input.paymentMethodVerificationStatus === "verified"
      ? 1
      : input.paymentMethodVerificationStatus === "pending"
        ? 0.5
        : input.paymentMethodVerificationStatus === "unverified"
          ? 0.25
          : 0;

  return clamp(
    kycScore * 0.3 + taxScore * 0.2 + complianceScore * 0.35 + paymentScore * 0.15
  );
}

function calculateRiskScore(input: WithdrawalSignalInput): number {
  let risk =
    clamp(input.fraudRisk) * 0.22 +
    clamp(input.chargebackRisk) * 0.15 +
    clamp(input.accountTakeoverRisk) * 0.22 +
    clamp(input.moneyLaunderingRisk) * 0.2 +
    clamp(input.payoutRailRisk) * 0.1 +
    clamp(input.withdrawalVelocityScore) * 0.07 +
    (input.deviceIntegrityScore < 0.5 ? 0.04 : 0);

  if (input.recentSeverePenaltyCount > 0) risk += 0.18;
  if (input.walletLocked || input.withdrawalsLocked) risk += 0.12;

  return clamp(risk);
}

function calculatePayoutSafetyScore(input: WithdrawalSignalInput): number {
  const balanceCoverage =
    input.requestedAmount <= 0 ? 0 : clamp(input.availableBalance / input.requestedAmount);

  const trust = clamp(input.trustScore / 100);
  const uValue = clamp(input.uValueScore / 100);
  const riskScore = calculateRiskScore(input);

  return clamp(
    balanceCoverage * 0.25 +
      trust * 0.25 +
      uValue * 0.1 +
      calculateComplianceScore(input) * 0.25 +
      (1 - riskScore) * 0.15
  );
}

function calculateWithdrawalEligibilityScore(input: WithdrawalSignalInput): number {
  const trust = clamp(input.trustScore / 100);
  const uValue = clamp(input.uValueScore / 100);
  const complianceScore = calculateComplianceScore(input);
  const payoutSafetyScore = calculatePayoutSafetyScore(input);
  const riskScore = calculateRiskScore(input);

  return clamp(
    trust * 0.25 +
      uValue * 0.1 +
      complianceScore * 0.3 +
      payoutSafetyScore * 0.25 +
      (1 - riskScore) * 0.1
  );
}

function decideWithdrawalStatus(params: {
  input: WithdrawalSignalInput;
  rule: WithdrawalRuleSet;
  withdrawalEligibilityScore: number;
  complianceScore: number;
  payoutSafetyScore: number;
  riskScore: number;
  reasons: string[];
}): WithdrawalStatus {
  const {
    input,
    rule,
    withdrawalEligibilityScore,
    complianceScore,
    payoutSafetyScore,
    riskScore,
    reasons
  } = params;

  if (input.sourceCoin !== "I") {
    reasons.push("only_icoin_can_be_withdrawn");
    return "withdrawal_rejected";
  }

  if (input.walletLocked) {
    reasons.push("wallet_locked");
    return "wallet_locked";
  }

  if (input.withdrawalsLocked) {
    reasons.push("withdrawals_locked");
    return "withdrawal_held";
  }

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_withdrawal_not_allowed");
    return "withdrawal_rejected";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_withdrawal_not_allowed");
    return "withdrawal_rejected";
  }

  if (
    (isUnder13(input.ageBand) || isTeen(input.ageBand)) &&
    rule.guardianRequiredForMinors &&
    !input.guardianApproved
  ) {
    reasons.push("minor_withdrawal_requires_guardian_approval");
    return "withdrawal_pending_review";
  }

  if (
    input.complianceStatus === "blocked" ||
    input.complianceStatus === "sanctions_match" ||
    input.complianceStatus === "region_blocked"
  ) {
    reasons.push("compliance_status_blocked");
    return "compliance_blocked";
  }

  if (input.requestedAmount < rule.minAmount) {
    reasons.push("requested_amount_below_minimum");
    return "withdrawal_rejected";
  }

  if (input.requestedAmount > rule.maxAmount) {
    reasons.push("requested_amount_above_maximum");
    return "withdrawal_pending_review";
  }

  if (input.availableBalance < input.requestedAmount) {
    reasons.push("insufficient_available_balance");
    return "withdrawal_rejected";
  }

  if (input.pendingBalance > 0 && input.availableBalance < input.requestedAmount) {
    reasons.push("pending_balance_not_withdrawable");
    return "withdrawal_rejected";
  }

  if (input.trustScore < rule.minTrustScore) {
    reasons.push("trust_score_below_minimum");
    return "withdrawal_pending_review";
  }

  if (input.uValueScore < rule.minUValueScore) {
    reasons.push("u_value_below_minimum");
    return "withdrawal_pending_review";
  }

  if (rule.requiresKyc && input.kycStatus !== "verified") {
    reasons.push("kyc_required_or_not_verified");
    return input.kycStatus === "pending" ? "withdrawal_pending_review" : "withdrawal_held";
  }

  if (rule.requiresTaxProfile && input.taxProfileStatus !== "verified") {
    reasons.push("tax_profile_required_or_not_verified");
    return input.taxProfileStatus === "pending"
      ? "withdrawal_pending_review"
      : "withdrawal_held";
  }

  if (rule.requiresVerifiedPaymentMethod && input.paymentMethodVerificationStatus !== "verified") {
    reasons.push("payment_method_not_verified");
    return input.paymentMethodVerificationStatus === "pending"
      ? "withdrawal_pending_review"
      : "withdrawal_held";
  }

  if (input.recentSeverePenaltyCount > rule.maxRecentSeverePenaltyCount) {
    reasons.push("recent_severe_penalty_blocks_withdrawal");
    return "withdrawal_rejected";
  }

  if (input.recentPenaltyCount > rule.maxRecentPenaltyCount) {
    reasons.push("recent_penalty_count_above_maximum");
    return "withdrawal_pending_review";
  }

  if (input.recentWithdrawalCount > rule.maxRecentWithdrawalCount) {
    reasons.push("recent_withdrawal_count_above_maximum");
    return "withdrawal_pending_review";
  }

  if (input.recentWithdrawalAmount > rule.maxRecentWithdrawalAmount) {
    reasons.push("recent_withdrawal_amount_above_maximum");
    return "withdrawal_pending_review";
  }

  if (input.withdrawalVelocityScore > rule.maxWithdrawalVelocityScore) {
    reasons.push("withdrawal_velocity_above_maximum");
    return "withdrawal_pending_review";
  }

  if (input.fraudRisk > rule.maxFraudRisk) {
    reasons.push("fraud_risk_above_maximum");
    return "suspicious";
  }

  if (input.chargebackRisk > rule.maxChargebackRisk) {
    reasons.push("chargeback_risk_above_maximum");
    return "suspicious";
  }

  if (input.accountTakeoverRisk > rule.maxAccountTakeoverRisk) {
    reasons.push("account_takeover_risk_above_maximum");
    return "suspicious";
  }

  if (input.moneyLaunderingRisk > rule.maxMoneyLaunderingRisk) {
    reasons.push("money_laundering_risk_above_maximum");
    return "suspicious";
  }

  if (input.payoutRailRisk > rule.maxPayoutRailRisk) {
    reasons.push("payout_rail_risk_above_maximum");
    return "withdrawal_pending_review";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.7 ? "suspicious" : "withdrawal_held";
  }

  if (complianceScore < rule.minComplianceScore) {
    reasons.push("compliance_score_below_minimum");
    return "withdrawal_pending_review";
  }

  if (payoutSafetyScore < rule.minPayoutSafetyScore) {
    reasons.push("payout_safety_score_below_minimum");
    return "withdrawal_pending_review";
  }

  if (withdrawalEligibilityScore < rule.minWithdrawalEligibilityScore) {
    reasons.push("withdrawal_eligibility_below_minimum");
    return "withdrawal_pending_review";
  }

  reasons.push("withdrawal_approved");
  return "withdrawal_approved";
}

function createWithdrawalAlphabetEvent(params: {
  input: WithdrawalSignalInput;
  eventType: AlphabetEvent["eventType"];
  coinCode: AlphabetEvent["coinCode"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  payoutAmount: number;
  feeAmount: number;
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: params.coinCode,
    eventType: params.eventType,
    objectType: "withdrawal_request",
    objectId: params.input.withdrawalRequestId,
    sourceContext: "wallet",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.trustScore,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      withdrawalRequestId: params.input.withdrawalRequestId,
      walletId: params.input.walletId,
      sourceCoin: params.input.sourceCoin,
      requestedAmount: params.input.requestedAmount,
      payoutAmount: params.payoutAmount,
      feeAmount: params.feeAmount,
      payoutMethod: params.input.payoutMethod,
      region: params.input.region,
      countryCode: params.input.countryCode,
      kycStatus: params.input.kycStatus,
      taxProfileStatus: params.input.taxProfileStatus,
      complianceStatus: params.input.complianceStatus,
      paymentMethodVerificationStatus: params.input.paymentMethodVerificationStatus,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyWithdrawalRequest(
  input: WithdrawalSignalInput
): WithdrawalVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  if (!rule) {
    const riskScore = calculateRiskScore(input);
    const complianceScore = calculateComplianceScore(input);
    const payoutSafetyScore = calculatePayoutSafetyScore(input);
    const withdrawalEligibilityScore = calculateWithdrawalEligibilityScore(input);

    reasons.push("no_active_withdrawal_rule");

    const withdrawalRequestedEvent = createWithdrawalAlphabetEvent({
      input,
      eventType: "withdrawal_requested",
      coinCode: "I",
      rawScore: withdrawalEligibilityScore,
      qualityScore: complianceScore,
      riskScore,
      verificationStatus: "rejected",
      payoutAmount: 0,
      feeAmount: 0,
      metadata: { reasons }
    });

    return {
      withdrawalRequestId: input.withdrawalRequestId,
      walletId: input.walletId,
      userId: input.userId,
      status: "withdrawal_rejected",
      sourceCoin: input.sourceCoin,
      requestedAmount: input.requestedAmount,
      payoutAmount: 0,
      feeAmount: 0,
      withdrawalEligibilityScore,
      complianceScore,
      payoutSafetyScore,
      riskScore,
      reasons,
      withdrawalRequestedEvent,
      withdrawalApprovedEvent: null,
      withdrawalHeldEvent: null,
      withdrawalRejectedEvent: withdrawalRequestedEvent,
      payoutCompletedEvent: null,
      complianceBlockedEvent: null,
      withdrawalFraudEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const feeAmount = calculateFeeAmount(input, rule);
  const payoutAmount = calculatePayoutAmount(input, rule);
  const withdrawalEligibilityScore = calculateWithdrawalEligibilityScore(input);
  const complianceScore = calculateComplianceScore(input);
  const payoutSafetyScore = calculatePayoutSafetyScore(input);
  const riskScore = calculateRiskScore(input);
  const status = decideWithdrawalStatus({
    input,
    rule,
    withdrawalEligibilityScore,
    complianceScore,
    payoutSafetyScore,
    riskScore,
    reasons
  });

  const verificationStatus = status === "withdrawal_approved" ? "verified" : "rejected";

  const withdrawalRequestedEvent = createWithdrawalAlphabetEvent({
    input,
    eventType: "withdrawal_requested",
    coinCode: "I",
    rawScore: withdrawalEligibilityScore,
    qualityScore: complianceScore,
    riskScore,
    verificationStatus,
    payoutAmount,
    feeAmount,
    metadata: { status, reasons }
  });

  const withdrawalApprovedEvent =
    status === "withdrawal_approved"
      ? createWithdrawalAlphabetEvent({
          input,
          eventType: "withdrawal_approved",
          coinCode: "I",
          rawScore: withdrawalEligibilityScore,
          qualityScore: complianceScore,
          riskScore,
          verificationStatus: "verified",
          payoutAmount,
          feeAmount,
          metadata: { status, reasons }
        })
      : null;

  const payoutCompletedEvent =
    status === "withdrawal_approved" && input.metadata?.["payoutCompleted"] === true
      ? createWithdrawalAlphabetEvent({
          input,
          eventType: "payout_completed",
          coinCode: "I",
          rawScore: withdrawalEligibilityScore,
          qualityScore: payoutSafetyScore,
          riskScore,
          verificationStatus: "verified",
          payoutAmount,
          feeAmount,
          metadata: {
            status,
            payoutCompleted: true,
            reasons
          }
        })
      : null;

  const withdrawalHeldEvent =
    status === "withdrawal_held" || status === "withdrawal_pending_review"
      ? createWithdrawalAlphabetEvent({
          input,
          eventType: "withdrawal_held",
          coinCode: "I",
          rawScore: withdrawalEligibilityScore,
          qualityScore: complianceScore,
          riskScore,
          verificationStatus: "rejected",
          payoutAmount,
          feeAmount,
          metadata: { status, reasons }
        })
      : null;

  const withdrawalRejectedEvent =
    status === "withdrawal_rejected" || status === "wallet_locked"
      ? createWithdrawalAlphabetEvent({
          input,
          eventType: "withdrawal_rejected",
          coinCode: "I",
          rawScore: withdrawalEligibilityScore,
          qualityScore: complianceScore,
          riskScore,
          verificationStatus: "rejected",
          payoutAmount,
          feeAmount,
          metadata: { status, reasons }
        })
      : null;

  const complianceBlockedEvent =
    status === "compliance_blocked"
      ? createWithdrawalAlphabetEvent({
          input,
          eventType: "compliance_blocked",
          coinCode: "I",
          rawScore: 0,
          qualityScore: complianceScore,
          riskScore,
          verificationStatus: "rejected",
          payoutAmount: 0,
          feeAmount,
          metadata: { status, reasons }
        })
      : null;

  const withdrawalFraudEvent =
    status === "suspicious"
      ? createWithdrawalAlphabetEvent({
          input,
          eventType: "withdrawal_fraud_detected",
          coinCode: "I",
          rawScore: 0,
          qualityScore: 0,
          riskScore,
          verificationStatus: "rejected",
          payoutAmount: 0,
          feeAmount,
          metadata: { status, reasons }
        })
      : null;

  return {
    withdrawalRequestId: input.withdrawalRequestId,
    walletId: input.walletId,
    userId: input.userId,
    status,
    sourceCoin: input.sourceCoin,
    requestedAmount: input.requestedAmount,
    payoutAmount,
    feeAmount,
    withdrawalEligibilityScore,
    complianceScore,
    payoutSafetyScore,
    riskScore,
    reasons,
    withdrawalRequestedEvent,
    withdrawalApprovedEvent,
    withdrawalHeldEvent,
    withdrawalRejectedEvent,
    payoutCompletedEvent,
    complianceBlockedEvent,
    withdrawalFraudEvent,
    metadata: {
      rulePayoutMethod: rule.payoutMethod,
      ...input.metadata
    }
  };
}
