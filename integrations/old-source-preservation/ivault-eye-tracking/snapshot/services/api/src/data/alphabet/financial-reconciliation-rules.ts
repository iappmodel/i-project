import type { FinancialReconciliationRuleSet } from "@/types/alphabet/financial-reconciliation.types";

const EPSILON = 0.000001;

export const FINANCIAL_RECONCILIATION_RULES: FinancialReconciliationRuleSet[] = [
  {
    reportScope: "global_daily",
    epsilon: EPSILON,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.75,
    active: true
  },
  {
    reportScope: "coin_daily",
    epsilon: EPSILON,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.75,
    active: true
  },
  {
    reportScope: "provider_daily",
    epsilon: EPSILON,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.7,
    active: true
  },
  {
    reportScope: "wallet_daily",
    epsilon: EPSILON,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.75,
    active: true
  },
  {
    reportScope: "campaign_daily",
    epsilon: EPSILON,
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warningRiskScore: 0.2,
    dangerRiskScore: 0.45,
    criticalRiskScore: 0.75,
    active: true
  }
];

export function getFinancialReconciliationRule(
  reportScope: string
): FinancialReconciliationRuleSet | null {
  return (
    FINANCIAL_RECONCILIATION_RULES.find(
      (rule) => rule.active && rule.reportScope === reportScope
    ) ?? null
  );
}
