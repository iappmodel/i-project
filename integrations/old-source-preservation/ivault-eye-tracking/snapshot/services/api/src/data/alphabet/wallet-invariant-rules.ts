import type { WalletInvariantRuleSet } from "@/types/alphabet/wallet-invariant.types";

const EPSILON = 0.000001;

function ruleBase(
  invariantType: WalletInvariantRuleSet["invariantType"],
  overrides: Partial<Omit<WalletInvariantRuleSet, "invariantType">> = {}
): WalletInvariantRuleSet {
  return {
    invariantType,
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    epsilon: EPSILON,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.5,
    criticalSeverityScore: 0.85,
    active: true,
    ...overrides
  };
}

export const WALLET_INVARIANT_RULES: WalletInvariantRuleSet[] = [
  ruleBase("wallet_balance_mismatch", {
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75
  }),
  ruleBase("wallet_account_balance_mismatch", {
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75
  }),
  ruleBase("wallet_negative_available_balance", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.85,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.4,
    criticalSeverityScore: 0.7
  }),
  ruleBase("wallet_negative_pending_balance", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.85,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.4,
    criticalSeverityScore: 0.7
  }),
  ruleBase("wallet_negative_reserved_balance", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.85,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.4,
    criticalSeverityScore: 0.7
  }),
  ruleBase("ledger_sum_mismatch", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.75
  }),
  ruleBase("value_lot_sum_mismatch", {
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75
  }),
  ruleBase("value_lot_without_ledger", {
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: false,
    minConfidenceScore: 0.75
  }),
  ruleBase("ledger_without_value_lot", {
    defaultSeverity: "warning",
    createsOperationalAlert: false,
    createsReviewCase: false,
    minConfidenceScore: 0.7,
    failSeverityScore: 0.55,
    criticalSeverityScore: 0.9
  }),
  ruleBase("reversal_without_original", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.75
  }),
  ruleBase("reversal_amount_mismatch", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8
  }),
  ruleBase("duplicate_reversal_detected", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.85
  }),
  ruleBase("withdrawal_debit_without_external_transfer", {
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75,
    warnSeverityScore: 0.25,
    failSeverityScore: 0.55,
    criticalSeverityScore: 0.9
  }),
  ruleBase("external_transfer_without_debit", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.75
  }),
  ruleBase("external_transfer_amount_mismatch", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.75
  }),
  ruleBase("compensation_without_original_ledger", {
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: false,
    minConfidenceScore: 0.75
  }),
  ruleBase("compensation_without_reversal_ledger", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.8,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.45,
    criticalSeverityScore: 0.75
  }),
  ruleBase("campaign_reserve_mismatch", {
    defaultSeverity: "danger",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.75
  }),
  ruleBase("impossible_wallet_state", {
    defaultSeverity: "critical",
    createsOperationalAlert: true,
    createsReviewCase: true,
    minConfidenceScore: 0.9,
    warnSeverityScore: 0.2,
    failSeverityScore: 0.4,
    criticalSeverityScore: 0.7
  })
];

export function getWalletInvariantRule(invariantType: string): WalletInvariantRuleSet | null {
  return (
    WALLET_INVARIANT_RULES.find((rule) => rule.active && rule.invariantType === invariantType) ?? null
  );
}
