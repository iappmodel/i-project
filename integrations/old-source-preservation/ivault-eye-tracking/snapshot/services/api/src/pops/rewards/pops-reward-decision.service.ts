import {
  completionScoreForLevel,
  finalRewardAmount,
  rewardQuality,
  trustMultiplierForTier
} from "./pops-reward-formula";
import {
  POPS_REWARD_REASON_CODE,
  isDeniedDecision
} from "./pops-reward-reason-codes";
import type {
  PopsRewardDecision,
  PopsRewardDecisionRequest,
  PopsRewardDecisionStatus,
  PopsRewardHoldReason
} from "./pops-reward-decision.types";
import {
  POPS_REWARD_DECISION_STATUS,
  POPS_REWARD_HOLD_REASON,
  POPS_WALLET_DECISION_STATUS
} from "./pops-reward-decision.types";
import type {
  PopsWalletIntegration,
  WalletDenyIntent,
  WalletHoldIntent,
  WalletTransactionIntent
} from "./pops-wallet-integration";
import { bundleToRewardVersionFields, resolvePopsVersionBundle } from "../versioning/pops-version-resolver";

function nowIso(): string {
  return new Date().toISOString();
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(6))));
}

function createDecisionId(): string {
  return `pops_reward_decision_${crypto.randomUUID()}`;
}

export function computeHoldReason(params: {
  decision: PopsRewardDecisionStatus;
  fraudRisk: number;
  trustTier: number;
  finalAmount: number;
}): PopsRewardHoldReason | null {
  if (params.decision === POPS_REWARD_DECISION_STATUS.HELD) {
    if (params.fraudRisk >= 0.75) return POPS_REWARD_HOLD_REASON.FRAUD_RISK_HIGH;
    return POPS_REWARD_HOLD_REASON.FRAUD_RISK_MEDIUM;
  }

  if (params.decision === POPS_REWARD_DECISION_STATUS.PENDING_REVIEW) {
    if (params.trustTier <= 1) return POPS_REWARD_HOLD_REASON.LOW_TRUST_TIER;
    if (params.finalAmount >= 1_000_000) return POPS_REWARD_HOLD_REASON.HIGH_VALUE_REWARD;
    return POPS_REWARD_HOLD_REASON.MANUAL_REVIEW_REQUIRED;
  }

  return null;
}

export function evaluatePopsRewardDecisionStatus(input: PopsRewardDecisionRequest): PopsRewardDecisionStatus {
  if (!input.isEligible) return POPS_REWARD_DECISION_STATUS.DENIED_INELIGIBLE;
  if (input.campaignExpired) return POPS_REWARD_DECISION_STATUS.DENIED_EXPIRED;
  if (input.isDuplicateAttempt) return POPS_REWARD_DECISION_STATUS.DENIED_DUPLICATE;
  if (input.fraudRisk >= 0.75) return POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK;
  if (input.fraudRisk >= 0.5) return POPS_REWARD_DECISION_STATUS.HELD;
  if (input.proofLevel >= 3 && input.intentConfidence < input.intentConfidenceThreshold) {
    if (input.intentLowConfidenceAction === "DENY") {
      return POPS_REWARD_DECISION_STATUS.DENIED_LOW_CONFIDENCE;
    }
    if (input.intentLowConfidenceAction === "HOLD") {
      return POPS_REWARD_DECISION_STATUS.HELD;
    }
    return POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL;
  }

  const completionScore = completionScoreForLevel(input.completionLevel);
  const quality = rewardQuality({
    presenceConfidence: input.presenceConfidence,
    attentionConfidence: input.attentionConfidence,
    intentConfidence: input.intentConfidence,
    completionScore,
    fraudRisk: input.fraudRisk
  });

  if (quality >= 0.85 && input.fraudRisk < 0.15) return POPS_REWARD_DECISION_STATUS.APPROVED_FULL;
  if (quality >= 0.65 && input.fraudRisk < 0.35) return POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL;
  if (quality >= 0.45) return POPS_REWARD_DECISION_STATUS.PENDING_REVIEW;
  return POPS_REWARD_DECISION_STATUS.DENIED_LOW_CONFIDENCE;
}

export interface PopsRewardDecisionResult {
  decision: PopsRewardDecision;
  walletTransactionIntent: WalletTransactionIntent | null;
  walletHoldIntent: WalletHoldIntent | null;
  walletDenyIntent: WalletDenyIntent | null;
}

export class PopsRewardDecisionService {
  constructor(private readonly walletIntegration: PopsWalletIntegration) {}

  async createDecision(input: PopsRewardDecisionRequest): Promise<PopsRewardDecisionResult> {
    const completionScore = completionScoreForLevel(input.completionLevel);
    const trustMultiplier = trustMultiplierForTier(input.trustTier);
    const computedQuality = rewardQuality({
      presenceConfidence: input.presenceConfidence,
      attentionConfidence: input.attentionConfidence,
      intentConfidence: input.intentConfidence,
      completionScore,
      fraudRisk: input.fraudRisk
    });
    const decision = evaluatePopsRewardDecisionStatus(input);

    const amount = finalRewardAmount({
      baseAmount: input.baseAmount,
      rewardQuality: computedQuality,
      trustMultiplier,
      campaignMultiplier: input.campaignMultiplier
    });

    const finalAmount = isDeniedDecision(decision) ? 0 : amount;
    const holdReason = computeHoldReason({
      decision,
      fraudRisk: input.fraudRisk,
      trustTier: input.trustTier,
      finalAmount
    });
    const holdRequired =
      decision === POPS_REWARD_DECISION_STATUS.HELD ||
      decision === POPS_REWARD_DECISION_STATUS.PENDING_REVIEW;

    const reasonCodes: string[] = [];
    if (!input.isEligible) reasonCodes.push(POPS_REWARD_REASON_CODE.INELIGIBLE_USER);
    if (input.campaignExpired) reasonCodes.push(POPS_REWARD_REASON_CODE.CAMPAIGN_EXPIRED);
    if (input.isDuplicateAttempt) reasonCodes.push(POPS_REWARD_REASON_CODE.DUPLICATE_ATTEMPT);
    if (input.proofLevel >= 3 && input.intentConfidence < input.intentConfidenceThreshold) {
      reasonCodes.push(POPS_REWARD_REASON_CODE.QUALITY_BELOW_THRESHOLD);
    }
    if (decision === POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK) {
      reasonCodes.push(POPS_REWARD_REASON_CODE.FRAUD_RISK_BLOCKED);
    } else if (decision === POPS_REWARD_DECISION_STATUS.HELD) {
      reasonCodes.push(POPS_REWARD_REASON_CODE.FRAUD_RISK_REVIEW);
    } else if (decision === POPS_REWARD_DECISION_STATUS.APPROVED_FULL) {
      reasonCodes.push(POPS_REWARD_REASON_CODE.QUALITY_HIGH_CONFIDENCE);
    } else if (decision === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL) {
      reasonCodes.push(POPS_REWARD_REASON_CODE.QUALITY_PARTIAL_CONFIDENCE);
    } else if (decision === POPS_REWARD_DECISION_STATUS.PENDING_REVIEW) {
      reasonCodes.push(POPS_REWARD_REASON_CODE.QUALITY_REVIEW_BAND);
    } else if (decision === POPS_REWARD_DECISION_STATUS.DENIED_LOW_CONFIDENCE) {
      reasonCodes.push(POPS_REWARD_REASON_CODE.QUALITY_BELOW_THRESHOLD);
    }

    const decisionId = createDecisionId();
    let walletTransactionIntent: WalletTransactionIntent | null = null;
    let walletHoldIntent: WalletHoldIntent | null = null;
    let walletDenyIntent: WalletDenyIntent | null = null;

    if (decision === POPS_REWARD_DECISION_STATUS.APPROVED_FULL) {
      walletTransactionIntent = await this.walletIntegration.createPendingReward({
        decisionId,
        sessionId: input.sessionId,
        userId: input.userId,
        amountMinor: finalAmount,
        coinType: input.coinType,
        status: POPS_WALLET_DECISION_STATUS.PENDING_AVAILABLE_SOON,
        hold: false
      });
      reasonCodes.push(POPS_REWARD_REASON_CODE.WALLET_PENDING_CREATED);
    } else if (decision === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL) {
      walletTransactionIntent = await this.walletIntegration.createPendingReward({
        decisionId,
        sessionId: input.sessionId,
        userId: input.userId,
        amountMinor: finalAmount,
        coinType: input.coinType,
        status: POPS_WALLET_DECISION_STATUS.PENDING_AVAILABLE_SOON,
        hold: false
      });
      reasonCodes.push(POPS_REWARD_REASON_CODE.WALLET_PENDING_CREATED);
    } else if (decision === POPS_REWARD_DECISION_STATUS.PENDING_REVIEW) {
      walletTransactionIntent = await this.walletIntegration.createPendingReward({
        decisionId,
        sessionId: input.sessionId,
        userId: input.userId,
        amountMinor: finalAmount,
        coinType: input.coinType,
        status: POPS_WALLET_DECISION_STATUS.PENDING_REVIEW,
        hold: true
      });
      reasonCodes.push(POPS_REWARD_REASON_CODE.WALLET_PENDING_CREATED);
    } else if (decision === POPS_REWARD_DECISION_STATUS.HELD) {
      walletHoldIntent = await this.walletIntegration.holdReward({
        decisionId,
        sessionId: input.sessionId,
        userId: input.userId,
        amountMinor: finalAmount,
        coinType: input.coinType,
        reason: holdReason ?? POPS_REWARD_HOLD_REASON.MANUAL_REVIEW_REQUIRED
      });
      reasonCodes.push(POPS_REWARD_REASON_CODE.WALLET_HELD_CREATED);
    } else {
      walletDenyIntent = await this.walletIntegration.denyReward({
        decisionId,
        sessionId: input.sessionId,
        userId: input.userId,
        decision,
        reasonCodes
      });
      reasonCodes.push(POPS_REWARD_REASON_CODE.AUDIT_ONLY);
    }

    const createdAt = nowIso();
    const versionBundle = resolvePopsVersionBundle({
      sessionAt: createdAt,
      campaignId: input.campaignId,
      region: "GLOBAL",
      appVersion: "1.0.0",
      featureFlags: {}
    });
    const rv = bundleToRewardVersionFields(versionBundle);

    const resultDecision: PopsRewardDecision = {
      id: decisionId,
      sessionId: input.sessionId,
      userId: input.userId,
      campaignId: input.campaignId,
      contentId: input.contentId,
      coinType: input.coinType,
      baseAmount: input.baseAmount,
      finalAmount,
      decision,
      rewardQuality: clamp(computedQuality),
      presenceConfidence: clamp(input.presenceConfidence),
      attentionConfidence: clamp(input.attentionConfidence),
      intentConfidence: clamp(input.intentConfidence),
      continuityConfidence: clamp(input.continuityConfidence),
      fraudRisk: clamp(input.fraudRisk),
      holdRequired,
      holdReason,
      reasonCodes,
      walletTransactionIntent: walletTransactionIntent
        ? {
            type: "PENDING_REWARD",
            status: walletTransactionIntent.status,
            amountMinor: walletTransactionIntent.amountMinor,
            hold: walletTransactionIntent.hold
          }
        : null,
      rewardFormulaVersion: rv.rewardFormulaVersion,
      walletRuleVersion: rv.walletRuleVersion,
      campaignRequirementVersion: rv.campaignRequirementVersion,
      createdAt
    };

    return {
      decision: resultDecision,
      walletTransactionIntent,
      walletHoldIntent,
      walletDenyIntent
    };
  }
}
