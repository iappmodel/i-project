import { CONVERSION_RULES } from "../../data/alphabet/conversion-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  ConversionRuleSet,
  ConversionSignalInput,
  ConversionStatus,
  ConversionVerificationResult
} from "../../types/alphabet/conversion.types";
import type {
  ConversionExecutionContext,
  ConversionExecutionResult
} from "../../types/alphabet/conversion-engine.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: ConversionSignalInput): ConversionRuleSet | undefined {
  return CONVERSION_RULES.find(
    (rule) =>
      rule.active &&
      rule.sourceCoin === input.sourceCoin &&
      rule.targetCoin === input.targetCoin
  );
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateTargetAmount(input: ConversionSignalInput): number {
  const gross = input.sourceAmount * input.conversionRate;
  const fee = gross * input.conversionFeeRate;
  return Number(Math.max(0, gross - fee).toFixed(6));
}

function calculateConversionFeeAmount(input: ConversionSignalInput): number {
  return Number((input.sourceAmount * input.conversionRate * input.conversionFeeRate).toFixed(6));
}

function calculateLiquidityScore(input: ConversionSignalInput): number {
  if (input.sourceAmount <= 0) return 0;

  const requiredTargetAmount = calculateTargetAmount(input);
  if (requiredTargetAmount <= 0) return 0;

  const coverageScore = clamp(input.liquidityAvailableAmount / requiredTargetAmount);
  const reserveHealth = clamp(input.liquidityReserveRatio);

  return clamp(coverageScore * 0.65 + reserveHealth * 0.35);
}

function calculateRiskScore(input: ConversionSignalInput): number {
  let risk =
    clamp(input.walletRiskScore) * 0.2 +
    clamp(input.fraudRisk) * 0.25 +
    clamp(input.chargebackRisk) * 0.16 +
    clamp(input.sourceCoinAbuseRisk) * 0.14 +
    clamp(input.conversionVelocityRisk) * 0.15 +
    clamp(input.liquidityManipulationRisk) * 0.1;

  if (input.recentSeverePenaltyCount > 0) risk += 0.2;
  if (input.recentPenaltyCount > 3) risk += 0.08;
  if (input.walletLocked) risk += 0.2;

  return clamp(risk);
}

function calculateValueScore(input: ConversionSignalInput): number {
  const trust = clamp(input.trustScore / 100);
  const uValue = clamp(input.uValueScore / 100);
  const balanceAdequacy = input.sourceAmount <= 0
    ? 0
    : clamp(input.availableSourceBalance / input.sourceAmount);

  const sourceAmountScale = clamp(input.sourceAmount / 1000);

  return clamp(
    trust * 0.35 +
      uValue * 0.2 +
      balanceAdequacy * 0.25 +
      sourceAmountScale * 0.1 +
      calculateLiquidityScore(input) * 0.1
  );
}

function calculateConversionEligibilityScore(input: ConversionSignalInput): number {
  const trust = clamp(input.trustScore / 100);
  const uValue = clamp(input.uValueScore / 100);
  const valueScore = calculateValueScore(input);
  const liquidityScore = calculateLiquidityScore(input);
  const riskScore = calculateRiskScore(input);

  const score =
    trust * 0.25 +
    uValue * 0.15 +
    valueScore * 0.3 +
    liquidityScore * 0.2 +
    (1 - riskScore) * 0.1;

  return clamp(score);
}

function decideConversionStatus(params: {
  input: ConversionSignalInput;
  rule: ConversionRuleSet;
  conversionEligibilityScore: number;
  liquidityScore: number;
  valueScore: number;
  riskScore: number;
  reasons: string[];
}): ConversionStatus {
  const { input, rule, conversionEligibilityScore, liquidityScore, valueScore, riskScore, reasons } =
    params;

  if (!rule.convertible) {
    reasons.push("source_coin_not_convertible");
    return "conversion_rejected";
  }

  if (!rule.allowedSourceStates.includes(input.sourceState)) {
    reasons.push("source_state_not_convertible");
    return input.sourceState === "pending" ? "conversion_pending" : "conversion_rejected";
  }

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_conversion_not_allowed");
    return "conversion_rejected";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_conversion_not_allowed");
    return "conversion_rejected";
  }

  if (
    (isUnder13(input.ageBand) || isTeen(input.ageBand)) &&
    rule.guardianRequiredForMinors &&
    !input.metadata?.guardianApproved
  ) {
    reasons.push("minor_conversion_requires_guardian_approval");
    return "conversion_pending";
  }

  if (input.walletLocked) {
    reasons.push("wallet_locked");
    return "wallet_locked";
  }

  if (input.withdrawalLocked) {
    reasons.push("withdrawal_locked_conversion_allowed_but_pending");
    return "conversion_pending";
  }

  if (input.recentSeverePenaltyCount > rule.maxRecentSeverePenaltyCount) {
    reasons.push("recent_severe_penalty_blocks_conversion");
    return "conversion_rejected";
  }

  if (input.recentPenaltyCount > rule.maxRecentPenaltyCount) {
    reasons.push("recent_penalty_count_above_maximum");
    return "conversion_pending";
  }

  if (input.sourceAmount < rule.minSourceAmount) {
    reasons.push("source_amount_below_minimum");
    return "conversion_rejected";
  }

  if (input.sourceAmount > rule.maxSourceAmount) {
    reasons.push("source_amount_above_maximum");
    return "conversion_pending";
  }

  if (input.availableSourceBalance < input.sourceAmount) {
    reasons.push("insufficient_available_source_balance");
    return "conversion_rejected";
  }

  if (input.trustScore < rule.minTrustScore) {
    reasons.push("trust_score_below_minimum");
    return "conversion_pending";
  }

  if (input.uValueScore < rule.minUValueScore) {
    reasons.push("u_value_below_minimum");
    return "conversion_pending";
  }

  if (input.walletRiskScore > rule.maxWalletRiskScore) {
    reasons.push("wallet_risk_above_maximum");
    return "suspicious";
  }

  if (input.fraudRisk > rule.maxFraudRisk) {
    reasons.push("fraud_risk_above_maximum");
    return "suspicious";
  }

  if (input.chargebackRisk > rule.maxChargebackRisk) {
    reasons.push("chargeback_risk_above_maximum");
    return "suspicious";
  }

  if (input.conversionVelocityRisk > rule.maxConversionVelocityRisk) {
    reasons.push("conversion_velocity_risk_above_maximum");
    return "suspicious";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.7 ? "suspicious" : "conversion_pending";
  }

  if (rule.requiresLiquidityReserve && liquidityScore < rule.minLiquidityScore) {
    reasons.push("liquidity_score_below_minimum");
    return "liquidity_unavailable";
  }

  if (valueScore < rule.minValueScore) {
    reasons.push("value_score_below_minimum");
    return "conversion_pending";
  }

  if (conversionEligibilityScore < rule.minConversionEligibilityScore) {
    reasons.push("conversion_eligibility_below_minimum");
    return "conversion_pending";
  }

  reasons.push("conversion_approved");
  return "conversion_approved";
}

function createConversionAlphabetEvent(params: {
  input: ConversionSignalInput;
  eventType: AlphabetEvent["eventType"];
  coinCode: AlphabetEvent["coinCode"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: params.coinCode,
    eventType: params.eventType,
    objectType: "conversion_quote",
    objectId: params.input.conversionQuoteId,
    sourceContext: "wallet",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.trustScore,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.verificationStatus,
    metadata: {
      conversionQuoteId: params.input.conversionQuoteId,
      walletId: params.input.walletId,
      sourceCoin: params.input.sourceCoin,
      targetCoin: params.input.targetCoin,
      sourceAmount: params.input.sourceAmount,
      targetAmount: calculateTargetAmount(params.input),
      conversionRate: params.input.conversionRate,
      conversionFeeRate: params.input.conversionFeeRate,
      conversionFeeAmount: calculateConversionFeeAmount(params.input),
      sourceState: params.input.sourceState,
      liquidityAvailableAmount: params.input.liquidityAvailableAmount,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyConversionQuote(
  input: ConversionSignalInput
): ConversionVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const conversionEligibilityScore = calculateConversionEligibilityScore(input);
  const liquidityScore = calculateLiquidityScore(input);
  const valueScore = calculateValueScore(input);
  const riskScore = calculateRiskScore(input);

  const targetAmount = calculateTargetAmount(input);
  const conversionFeeAmount = calculateConversionFeeAmount(input);

  if (!rule) {
    reasons.push("no_active_conversion_rule");

    const quoteCreatedEvent = createConversionAlphabetEvent({
      input,
      eventType: "conversion_quote_created",
      coinCode: input.targetCoin,
      rawScore: conversionEligibilityScore,
      qualityScore: valueScore,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      conversionQuoteId: input.conversionQuoteId,
      walletId: input.walletId,
      userId: input.userId,
      status: "conversion_rejected",
      sourceCoin: input.sourceCoin,
      targetCoin: input.targetCoin,
      sourceAmount: input.sourceAmount,
      targetAmount,
      conversionRate: input.conversionRate,
      conversionFeeRate: input.conversionFeeRate,
      conversionFeeAmount,
      conversionEligibilityScore,
      liquidityScore,
      valueScore,
      riskScore,
      reasons,
      quoteCreatedEvent,
      liquidityReservedEvent: null,
      conversionApprovedEvent: null,
      conversionCompletedEvent: null,
      conversionRejectedEvent: quoteCreatedEvent,
      liquidityReleasedEvent: null,
      conversionFraudEvent: null,
      vCoinEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideConversionStatus({
    input,
    rule,
    conversionEligibilityScore,
    liquidityScore,
    valueScore,
    riskScore,
    reasons
  });

  const verificationStatus =
    status === "conversion_approved" ? "verified" : "rejected";

  const quoteCreatedEvent = createConversionAlphabetEvent({
    input,
    eventType: "conversion_quote_created",
    coinCode: input.targetCoin,
    rawScore: conversionEligibilityScore,
    qualityScore: valueScore,
    riskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const liquidityReservedEvent =
    status === "conversion_approved" && rule.requiresLiquidityReserve
      ? createConversionAlphabetEvent({
          input,
          eventType: "liquidity_reserved",
          coinCode: input.targetCoin,
          rawScore: liquidityScore,
          qualityScore: valueScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            reservedAmount: targetAmount,
            reasons
          }
        })
      : null;

  const conversionApprovedEvent =
    status === "conversion_approved"
      ? createConversionAlphabetEvent({
          input,
          eventType: "conversion_approved",
          coinCode: input.targetCoin,
          rawScore: conversionEligibilityScore,
          qualityScore: valueScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  const conversionCompletedEvent =
    status === "conversion_approved"
      ? createConversionAlphabetEvent({
          input,
          eventType: "conversion_completed",
          coinCode: input.targetCoin,
          rawScore: conversionEligibilityScore,
          qualityScore: valueScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            sourceDebitAmount: input.sourceAmount,
            targetCreditAmount: targetAmount,
            conversionFeeAmount,
            reasons
          }
        })
      : null;

  const conversionRejectedEvent =
    status === "conversion_rejected" ||
    status === "conversion_pending" ||
    status === "liquidity_unavailable" ||
    status === "wallet_locked"
      ? createConversionAlphabetEvent({
          input,
          eventType: "conversion_rejected",
          coinCode: input.targetCoin,
          rawScore: conversionEligibilityScore,
          qualityScore: valueScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  const liquidityReleasedEvent =
    status === "liquidity_unavailable"
      ? createConversionAlphabetEvent({
          input,
          eventType: "liquidity_released",
          coinCode: input.targetCoin,
          rawScore: liquidityScore,
          qualityScore: valueScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  const conversionFraudEvent =
    status === "suspicious"
      ? createConversionAlphabetEvent({
          input,
          eventType: "conversion_fraud_detected",
          coinCode: input.targetCoin,
          rawScore: 0,
          qualityScore: 0,
          riskScore,
          verificationStatus: "rejected",
          metadata: {
            status,
            reasons
          }
        })
      : null;

  const vCoinEvent =
    status === "conversion_approved"
      ? createConversionAlphabetEvent({
          input,
          eventType: "vcoin_adjusted",
          coinCode: "V",
          rawScore: valueScore,
          qualityScore: conversionEligibilityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            issueMode: "score_update",
            status,
            sourceCoin: input.sourceCoin,
            targetCoin: input.targetCoin,
            convertibleValue: targetAmount,
            reasons
          }
        })
      : null;

  return {
    conversionQuoteId: input.conversionQuoteId,
    walletId: input.walletId,
    userId: input.userId,
    status,
    sourceCoin: input.sourceCoin,
    targetCoin: input.targetCoin,
    sourceAmount: input.sourceAmount,
    targetAmount,
    conversionRate: input.conversionRate,
    conversionFeeRate: input.conversionFeeRate,
    conversionFeeAmount,
    conversionEligibilityScore,
    liquidityScore,
    valueScore,
    riskScore,
    reasons,
    quoteCreatedEvent,
    liquidityReservedEvent,
    conversionApprovedEvent,
    conversionCompletedEvent,
    conversionRejectedEvent,
    liquidityReleasedEvent,
    conversionFraudEvent,
    vCoinEvent,
    metadata: {
      ruleSourceCoin: rule.sourceCoin,
      ruleTargetCoin: rule.targetCoin,
      ...input.metadata
    }
  };
}

export function executeCoinConversion(
  context: ConversionExecutionContext
): ConversionExecutionResult {
  const verification = verifyConversionQuote({
    conversionQuoteId: createId("conversion_quote"),
    walletId: context.walletId,
    userId: context.userId,
    sourceCoin: context.sourceCoin,
    targetCoin: context.targetCoin,
    sourceAmount: context.sourceAmount,
    sourceState: "available",
    availableSourceBalance: context.availableSourceBalance,
    conversionRate: 0,
    conversionFeeRate: 0,
    trustScore: context.trustScore,
    uValueScore: 0,
    walletRiskScore: context.riskScore,
    fraudRisk: context.riskScore,
    chargebackRisk: 0,
    sourceCoinAbuseRisk: 0,
    conversionVelocityRisk: 0,
    liquidityManipulationRisk: 0,
    recentPenaltyCount: 0,
    recentSeverePenaltyCount: 0,
    withdrawalLocked: false,
    walletLocked: false,
    liquidityAvailableAmount: Number.MAX_SAFE_INTEGER,
    liquidityReserveRatio: 1,
    ageBand: context.ageBand,
    metadata: {
      hasBudgetSource: context.hasBudgetSource,
      trustTier: context.trustTier,
      qualityScore: context.qualityScore
    }
  });

  if (verification.status === "conversion_approved") {
    return {
      converted: true,
      sourceCoin: context.sourceCoin,
      targetCoin: context.targetCoin,
      sourceAmount: context.sourceAmount,
      targetAmount: verification.targetAmount,
      targetState: "available"
    };
  }

  return {
    converted: false,
    reason: verification.reasons.join(", "),
    sourceCoin: context.sourceCoin,
    targetCoin: context.targetCoin,
    sourceAmount: context.sourceAmount,
    targetAmount: verification.targetAmount
  };
}
