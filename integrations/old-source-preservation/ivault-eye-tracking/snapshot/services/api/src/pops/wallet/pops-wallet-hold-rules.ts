import {
  POPS_WALLET_HOLD_REASON,
  POPS_WALLET_REWARD_STATUS,
  type PopsWalletHoldReason,
  type PopsWalletReleaseContext,
  type PopsWalletRewardStatus
} from "./pops-wallet.types";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export interface PopsWalletHoldRuleResult {
  status: PopsWalletRewardStatus;
  holdReason: PopsWalletHoldReason | null;
  releaseDelayMs: number | null;
  deniedReason: string | null;
}

function pendingWindowMs(context: PopsWalletReleaseContext): number {
  const highTrust = context.trustTier >= 4;
  const lowTrust = context.trustTier <= 1;
  const highValue = context.amount >= 100_000;
  const mediumRisk = context.fraudRisk >= 0.5;

  if (highTrust && context.amount <= 5_000 && context.fraudRisk < 0.15) {
    return 5 * MINUTE_MS;
  }
  if (mediumRisk) {
    return 24 * HOUR_MS;
  }
  if (lowTrust) {
    return 24 * HOUR_MS;
  }
  if (highValue) {
    return 24 * HOUR_MS;
  }
  return 30 * MINUTE_MS;
}

export function evaluatePopsWalletHoldRules(
  context: PopsWalletReleaseContext,
  pendingReview = false
): PopsWalletHoldRuleResult {
  if (context.ageRestricted && !context.ageEligible) {
    return {
      status: POPS_WALLET_REWARD_STATUS.DENIED,
      holdReason: null,
      releaseDelayMs: null,
      deniedReason: "AGE_RESTRICTED_INELIGIBLE"
    };
  }

  if (context.fraudRisk >= 0.85) {
    return {
      status: POPS_WALLET_REWARD_STATUS.DENIED,
      holdReason: POPS_WALLET_HOLD_REASON.FRAUD_RISK_HIGH,
      releaseDelayMs: null,
      deniedReason: "FRAUD_RISK_HIGH"
    };
  }

  if (context.kycRequired && !context.kycCompleted) {
    return {
      status: pendingReview ? POPS_WALLET_REWARD_STATUS.PENDING_REVIEW : POPS_WALLET_REWARD_STATUS.HELD,
      holdReason: POPS_WALLET_HOLD_REASON.KYC_REQUIRED,
      releaseDelayMs: null,
      deniedReason: null
    };
  }

  if (context.campaignRequiresHold) {
    return {
      status: POPS_WALLET_REWARD_STATUS.HELD,
      holdReason: POPS_WALLET_HOLD_REASON.CAMPAIGN_REQUIRES_HOLD,
      releaseDelayMs: null,
      deniedReason: null
    };
  }

  if (context.amount >= 250_000) {
    return {
      status: POPS_WALLET_REWARD_STATUS.HELD,
      holdReason: POPS_WALLET_HOLD_REASON.HIGH_VALUE_REWARD,
      releaseDelayMs: null,
      deniedReason: null
    };
  }

  if (context.fraudRisk >= 0.5) {
    return {
      status: POPS_WALLET_REWARD_STATUS.PENDING_REVIEW,
      holdReason: POPS_WALLET_HOLD_REASON.FRAUD_RISK_MEDIUM,
      releaseDelayMs: 24 * HOUR_MS,
      deniedReason: null
    };
  }

  return {
    status: pendingReview ? POPS_WALLET_REWARD_STATUS.PENDING_REVIEW : POPS_WALLET_REWARD_STATUS.PENDING,
    holdReason: pendingReview ? POPS_WALLET_HOLD_REASON.MANUAL_REVIEW_REQUIRED : null,
    releaseDelayMs: pendingWindowMs(context),
    deniedReason: null
  };
}
