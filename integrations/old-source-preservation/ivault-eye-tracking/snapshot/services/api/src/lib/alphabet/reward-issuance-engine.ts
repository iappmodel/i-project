import { ALPHABET_REWARD_RULES } from "../../data/alphabet/reward-rules";
import type { CoinLot, LedgerEntry } from "../../types/alphabet/wallet.types";
import type {
  RewardIssuanceContext,
  RewardIssuanceResult,
  RewardMultiplierSet,
  RewardRule
} from "../../types/alphabet/reward.types";
import { getCoinDefinition } from "./coin-utils";

function getRewardRuleForEvent(
  context: RewardIssuanceContext
): RewardRule | undefined {
  return ALPHABET_REWARD_RULES.find((rule) => {
    return rule.status === "active" && rule.eventType === context.event.eventType;
  });
}

function addHours(date: Date, hours: number): string {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next.toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function getAgeRank(ageBand: string): number {
  const ranks: Record<string, number> = {
    under_13: 0,
    "13_15": 1,
    "16_17": 2,
    "18_plus": 3
  };

  return ranks[ageBand] ?? -1;
}

function passesAgeRule(userAgeBand: string, minAgeBand?: string | null): boolean {
  if (!minAgeBand) return true;
  return getAgeRank(userAgeBand) >= getAgeRank(minAgeBand);
}

function calculateQualityMultiplier(qualityScore: number): number {
  if (qualityScore >= 0.95) return 2;
  if (qualityScore >= 0.85) return 1.5;
  if (qualityScore >= 0.7) return 1.2;
  if (qualityScore >= 0.5) return 1;
  if (qualityScore >= 0.35) return 0.5;
  return 0;
}

function calculateTrustMultiplier(trustScore: number): number {
  if (trustScore >= 90) return 1.5;
  if (trustScore >= 75) return 1.25;
  if (trustScore >= 50) return 1;
  if (trustScore >= 25) return 0.75;
  if (trustScore >= 10) return 0.5;
  return 0.25;
}

function calculateRiskMultiplier(riskScore: number): number {
  if (riskScore >= 0.9) return 0;
  if (riskScore >= 0.7) return 0.25;
  if (riskScore >= 0.5) return 0.5;
  if (riskScore >= 0.3) return 0.75;
  return 1;
}

function calculateAgeMultiplier(ageBand: string): number {
  switch (ageBand) {
    case "under_13":
      return 0.25;
    case "13_15":
      return 0.5;
    case "16_17":
      return 0.75;
    case "18_plus":
      return 1;
    default:
      return 0;
  }
}

function calculateMultipliers(context: RewardIssuanceContext): RewardMultiplierSet {
  return {
    qualityMultiplier: calculateQualityMultiplier(context.qualityScore),
    trustMultiplier: calculateTrustMultiplier(context.trustScore),
    riskMultiplier: calculateRiskMultiplier(context.riskScore),
    ageMultiplier: calculateAgeMultiplier(context.ageBand)
  };
}

function calculateFinalAmount(
  baseAmount: number,
  multipliers: RewardMultiplierSet
): number {
  const amount =
    baseAmount *
    multipliers.qualityMultiplier *
    multipliers.trustMultiplier *
    multipliers.riskMultiplier *
    multipliers.ageMultiplier;

  return Number(Math.max(0, amount).toFixed(6));
}

function createCoinLotFromReward(params: {
  walletId: string;
  rule: RewardRule;
  amount: number;
  sourceEventId: string;
  now: Date;
}): CoinLot {
  return {
    lotId: createId("lot"),
    walletId: params.walletId,
    coinCode: params.rule.targetCoin,
    sourceEventId: params.sourceEventId,
    sourceType: params.rule.sourceType,
    amountOriginal: params.amount,
    amountRemaining: params.amount,
    state: params.rule.defaultState,
    spendRestriction: null,
    ageRestriction: params.rule.minAgeBand ?? null,
    expiresAt: null,
    availableAt:
      params.rule.pendingDurationHours > 0
        ? addHours(params.now, params.rule.pendingDurationHours)
        : params.now.toISOString(),
    riskHoldUntil:
      params.rule.pendingDurationHours > 0
        ? addHours(params.now, params.rule.pendingDurationHours)
        : null,
    createdAt: params.now.toISOString(),
    updatedAt: params.now.toISOString()
  };
}

function createLedgerEntryFromReward(params: {
  walletId: string;
  rule: RewardRule;
  amount: number;
  lotId?: string | null;
  sourceEventId: string;
  now: Date;
}): LedgerEntry {
  return {
    entryId: createId("ledger"),
    walletId: params.walletId,
    coinCode: params.rule.targetCoin,
    lotId: params.lotId ?? null,
    direction: "credit",
    amount: params.amount,
    stateBefore: null,
    stateAfter: params.rule.defaultState,
    eventType: params.rule.eventType,
    sourceEventId: params.sourceEventId,
    counterpartyId: null,
    metadata: {
      rewardRuleId: params.rule.rewardRuleId,
      issueMode: params.rule.issueMode,
      sourceType: params.rule.sourceType
    },
    createdAt: params.now.toISOString()
  };
}

export function issueRewardFromVerifiedEvent(params: {
  walletId: string;
  context: RewardIssuanceContext;
}): RewardIssuanceResult {
  const { walletId, context } = params;
  const now = context.now ?? new Date();
  const { event } = context;

  const rule = getRewardRuleForEvent(context);

  if (!rule) {
    return {
      issued: false,
      reason: "No active reward rule for event.",
      event
    };
  }

  const coin = getCoinDefinition(rule.targetCoin);

  if (rule.requiresVerification && event.verificationStatus !== "verified") {
    return {
      issued: false,
      reason: "Event is not verified.",
      event,
      rule,
      targetCoin: rule.targetCoin
    };
  }

  if (coin.isSystemOnly && !rule.allowIfSystemOnly) {
    return {
      issued: false,
      reason: "Target coin is system-only and rule does not allow issuance.",
      event,
      rule,
      targetCoin: rule.targetCoin
    };
  }

  if (coin.shouldNeverConvertDirectlyToMoney && coin.isSpendable) {
    return {
      issued: false,
      reason: "Coin must not be issued as directly spendable value.",
      event,
      rule,
      targetCoin: rule.targetCoin
    };
  }

  if (coin.isSpendable && (context.trustScore < 50 || context.riskScore > 0.35)) {
    return {
      issued: false,
      reason: "Spendable coin issuance requires stronger trust and risk checks.",
      event,
      rule,
      targetCoin: rule.targetCoin
    };
  }

  if (rule.requiresBudgetSource && !context.hasBudgetSource) {
    return {
      issued: false,
      reason: "Reward requires funded budget source.",
      event,
      rule,
      targetCoin: rule.targetCoin
    };
  }

  if (!passesAgeRule(context.ageBand, rule.minAgeBand)) {
    return {
      issued: false,
      reason: "User age band does not meet reward rule requirement.",
      event,
      rule,
      targetCoin: rule.targetCoin
    };
  }

  const rawScore = event.rawScore ?? 0;

  if (rawScore < rule.minRawScore) {
    return {
      issued: false,
      reason: "Raw score below minimum threshold.",
      event,
      rule,
      targetCoin: rule.targetCoin
    };
  }

  if (context.qualityScore < rule.minQualityScore) {
    return {
      issued: false,
      reason: "Quality score below minimum threshold.",
      event,
      rule,
      targetCoin: rule.targetCoin
    };
  }

  if (context.riskScore > rule.maxRiskScore) {
    return {
      issued: false,
      reason: "Risk score exceeds maximum threshold.",
      event,
      rule,
      targetCoin: rule.targetCoin
    };
  }

  if (context.trustScore < rule.minTrustScore) {
    return {
      issued: false,
      reason: "Trust score below minimum threshold.",
      event,
      rule,
      targetCoin: rule.targetCoin
    };
  }

  const multipliers = calculateMultipliers(context);
  const finalAmount = calculateFinalAmount(rule.baseAmount, multipliers);

  if (finalAmount <= 0) {
    return {
      issued: false,
      reason: "Reward amount reduced to zero by multipliers.",
      event,
      rule,
      targetCoin: rule.targetCoin,
      baseAmount: rule.baseAmount,
      finalAmount,
      multipliers
    };
  }

  if (rule.issueMode === "blocked") {
    return {
      issued: false,
      reason: "Reward rule is blocked.",
      event,
      rule,
      targetCoin: rule.targetCoin,
      baseAmount: rule.baseAmount,
      finalAmount,
      multipliers
    };
  }

  if (
    rule.issueMode === "score_update" ||
    rule.issueMode === "identity_update" ||
    rule.issueMode === "access_update"
  ) {
    const ledgerEntry = createLedgerEntryFromReward({
      walletId,
      rule,
      amount: finalAmount,
      lotId: null,
      sourceEventId: event.eventId,
      now
    });

    return {
      issued: true,
      event,
      rule,
      targetCoin: rule.targetCoin,
      baseAmount: rule.baseAmount,
      finalAmount,
      multipliers,
      ledgerEntry
    };
  }

  const coinLot = createCoinLotFromReward({
    walletId,
    rule,
    amount: finalAmount,
    sourceEventId: event.eventId,
    now
  });

  const ledgerEntry = createLedgerEntryFromReward({
    walletId,
    rule,
    amount: finalAmount,
    lotId: coinLot.lotId,
    sourceEventId: event.eventId,
    now
  });

  return {
    issued: true,
    event,
    rule,
    targetCoin: rule.targetCoin,
    baseAmount: rule.baseAmount,
    finalAmount,
    multipliers,
    coinLot,
    ledgerEntry
  };
}
