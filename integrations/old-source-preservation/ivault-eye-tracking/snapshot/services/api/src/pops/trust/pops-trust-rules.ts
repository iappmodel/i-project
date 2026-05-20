import {
  POPS_RECOMMENDED_TRUST_ACTION,
  POPS_TRUST_EVENT_TYPE,
  POPS_TRUST_SEVERITY,
  type PopsRecommendedTrustAction,
  type PopsTrustEventType,
  type PopsTrustSeverity
} from "./pops-trust.types";

type WeightRange = { min: number; max: number };

const TRUST_WEIGHT_RANGES: Record<PopsTrustEventType, WeightRange> = {
  VERIFIED_HUMAN_MOMENT: { min: 0.01, max: 0.03 },
  VERIFIED_ATTENTION_SESSION: { min: 0.02, max: 0.05 },
  VERIFIED_INTENT_ACTION: { min: 0.03, max: 0.07 },
  CLEAN_REWARD_COMPLETION: { min: 0.02, max: 0.06 },
  CLEAN_CAMPAIGN_COMPLETION: { min: 0.04, max: 0.1 },
  CONSISTENT_DEVICE_PRESENCE: { min: 0.01, max: 0.03 },
  CONSISTENT_ACCOUNT_CONTINUITY: { min: 0.01, max: 0.03 },
  CLEAN_PAYOUT_BEHAVIOR: { min: 0.02, max: 0.06 },
  LOW_CONFIDENCE_SESSION: { min: -0.03, max: -0.01 },
  REPEATED_DEGRADED_SESSION: { min: -0.08, max: -0.03 },
  SUSPICIOUS_AUTOMATION_PATTERN: { min: -0.2, max: -0.08 },
  IMPOSSIBLE_PROGRESS_PATTERN: { min: -0.25, max: -0.1 },
  DEVICE_INTEGRITY_WARNING: { min: -0.3, max: -0.1 },
  DUPLICATE_REWARD_ATTEMPT: { min: -0.35, max: -0.15 },
  HIGH_FRAUD_RISK_SESSION: { min: -0.6, max: -0.25 },
  IDENTITY_CONTINUITY_BREAK: { min: -0.75, max: -0.3 },
  REWARD_ABUSE_PATTERN: { min: -1.0, max: -0.4 }
};

export function clampConfidence(confidence: number): number {
  return Math.max(0, Math.min(1, Number(confidence.toFixed(6))));
}

export function trustWeightRangeFor(eventType: PopsTrustEventType): WeightRange {
  return TRUST_WEIGHT_RANGES[eventType];
}

export function trustWeightFor(
  eventType: PopsTrustEventType,
  confidence: number,
  opts?: { forceNeutral?: boolean }
): number {
  if (opts?.forceNeutral) return 0;

  const normalized = clampConfidence(confidence);
  const range = trustWeightRangeFor(eventType);
  const value = range.min + (range.max - range.min) * normalized;
  return Number(value.toFixed(6));
}

export function severityFromFraudRisk(fraudRisk: number): PopsTrustSeverity {
  if (fraudRisk >= 0.9) return POPS_TRUST_SEVERITY.CRITICAL;
  if (fraudRisk >= 0.75) return POPS_TRUST_SEVERITY.HIGH;
  if (fraudRisk >= 0.5) return POPS_TRUST_SEVERITY.MEDIUM;
  if (fraudRisk >= 0.3) return POPS_TRUST_SEVERITY.LOW;
  return POPS_TRUST_SEVERITY.INFO;
}

export function recommendedActionFor(
  eventType: PopsTrustEventType,
  severity: PopsTrustSeverity,
  weight: number
): PopsRecommendedTrustAction {
  if (weight === 0) return POPS_RECOMMENDED_TRUST_ACTION.MONITOR;

  if (weight > 0) {
    if (eventType === POPS_TRUST_EVENT_TYPE.CLEAN_CAMPAIGN_COMPLETION || weight >= 0.06) {
      return POPS_RECOMMENDED_TRUST_ACTION.INCREASE_TRUST_MEDIUM;
    }
    return POPS_RECOMMENDED_TRUST_ACTION.INCREASE_TRUST_LOW;
  }

  if (eventType === POPS_TRUST_EVENT_TYPE.IDENTITY_CONTINUITY_BREAK) {
    return POPS_RECOMMENDED_TRUST_ACTION.REQUIRE_REVERIFICATION;
  }
  if (eventType === POPS_TRUST_EVENT_TYPE.REWARD_ABUSE_PATTERN) {
    return POPS_RECOMMENDED_TRUST_ACTION.BLOCK_REWARDS_TEMPORARILY;
  }
  if (eventType === POPS_TRUST_EVENT_TYPE.HIGH_FRAUD_RISK_SESSION) {
    return severity === POPS_TRUST_SEVERITY.CRITICAL
      ? POPS_RECOMMENDED_TRUST_ACTION.REQUIRE_KYC
      : POPS_RECOMMENDED_TRUST_ACTION.REDUCE_TRUST_HIGH;
  }
  if (eventType === POPS_TRUST_EVENT_TYPE.DUPLICATE_REWARD_ATTEMPT) {
    return POPS_RECOMMENDED_TRUST_ACTION.SEND_TO_MANUAL_REVIEW;
  }
  if (severity === POPS_TRUST_SEVERITY.HIGH || severity === POPS_TRUST_SEVERITY.CRITICAL) {
    return POPS_RECOMMENDED_TRUST_ACTION.REDUCE_TRUST_HIGH;
  }
  if (severity === POPS_TRUST_SEVERITY.MEDIUM) {
    return POPS_RECOMMENDED_TRUST_ACTION.REDUCE_TRUST_MEDIUM;
  }
  return POPS_RECOMMENDED_TRUST_ACTION.REDUCE_TRUST_LOW;
}
