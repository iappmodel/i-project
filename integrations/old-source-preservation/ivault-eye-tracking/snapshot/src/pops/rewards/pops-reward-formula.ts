import type { PopsScore } from "../types/pops.types";
import { clamp01 } from "../scoring/pops-score-utils";

export type PopsRewardQualityInput = Pick<
  PopsScore,
  "presenceConfidence" | "attentionConfidence" | "intentConfidence" | "continuityConfidence" | "fraudRisk"
>;

export function calculatePopsRewardQuality(score: PopsRewardQualityInput): number {
  const raw =
    0.4 * score.presenceConfidence +
    0.35 * score.attentionConfidence +
    0.1 * score.intentConfidence +
    0.15 * score.continuityConfidence -
    score.fraudRisk * 0.75;
  return clamp01(raw);
}

export function getPopsTrustMultiplier(trustTier: number): number {
  switch (trustTier) {
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
