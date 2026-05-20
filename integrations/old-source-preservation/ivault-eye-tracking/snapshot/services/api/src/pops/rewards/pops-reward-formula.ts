import {
  POPS_COMPLETION_LEVEL,
  type PopsCompletionLevel
} from "./pops-reward-decision.types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(6))));
}

export function completionScoreForLevel(level: PopsCompletionLevel): number {
  switch (level) {
    case POPS_COMPLETION_LEVEL.COMPLETED_REQUIRED:
      return 1.0;
    case POPS_COMPLETION_LEVEL.MOSTLY_COMPLETED:
      return 0.75;
    case POPS_COMPLETION_LEVEL.PARTIALLY_COMPLETED:
      return 0.5;
    case POPS_COMPLETION_LEVEL.NOT_COMPLETED:
      return 0.0;
    default:
      return 0.0;
  }
}

export function trustMultiplierForTier(tier: number): number {
  const normalizedTier = Math.max(0, Math.min(5, Math.floor(tier)));
  switch (normalizedTier) {
    case 0:
      return 0.5;
    case 1:
      return 0.75;
    case 2:
      return 1.0;
    case 3:
      return 1.1;
    case 4:
      return 1.2;
    case 5:
      return 1.35;
    default:
      return 1.0;
  }
}

export function fraudPenalty(fraudRisk: number): number {
  return clamp(fraudRisk) * 0.75;
}

export function rewardQuality(params: {
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  completionScore: number;
  fraudRisk: number;
}): number {
  const quality =
    clamp(params.presenceConfidence) * 0.35 +
    clamp(params.attentionConfidence) * 0.3 +
    clamp(params.intentConfidence) * 0.2 +
    clamp(params.completionScore) * 0.15 -
    fraudPenalty(params.fraudRisk);

  return clamp(quality);
}

export function finalRewardAmount(params: {
  baseAmount: number;
  rewardQuality: number;
  trustMultiplier: number;
  campaignMultiplier: number;
}): number {
  const computed =
    params.baseAmount *
    clamp(params.rewardQuality) *
    Math.max(0, params.trustMultiplier) *
    Math.max(0, params.campaignMultiplier);
  return Math.max(0, Math.round(computed));
}
