import type { TrustFraudReviewRuleSet } from "@/types/alphabet/trust-fraud-review.types";

export const TRUST_FRAUD_REVIEW_RULES: TrustFraudReviewRuleSet[] = [
  {
    batchScope: "global_daily",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.75,
    reviewRiskScore: 0.7,
    active: true
  },
  {
    batchScope: "user_daily",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.75,
    reviewRiskScore: 0.7,
    active: true
  },
  {
    batchScope: "creator_daily",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.75,
    reviewRiskScore: 0.7,
    active: true
  },
  {
    batchScope: "wallet_daily",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warningRiskScore: 0.15,
    dangerRiskScore: 0.4,
    criticalRiskScore: 0.7,
    reviewRiskScore: 0.65,
    active: true
  },
  {
    batchScope: "campaign_daily",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.75,
    reviewRiskScore: 0.7,
    active: true
  },
  {
    batchScope: "device_cluster_daily",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.72,
    reviewRiskScore: 0.68,
    active: true
  },
  {
    batchScope: "reward_daily",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.72,
    reviewRiskScore: 0.68,
    active: true
  },
  {
    batchScope: "payout_daily",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warningRiskScore: 0.15,
    dangerRiskScore: 0.4,
    criticalRiskScore: 0.7,
    reviewRiskScore: 0.65,
    active: true
  }
];

export function getTrustFraudReviewRule(batchScope: string): TrustFraudReviewRuleSet | null {
  return (
    TRUST_FRAUD_REVIEW_RULES.find((rule) => rule.active && rule.batchScope === batchScope) ?? null
  );
}
