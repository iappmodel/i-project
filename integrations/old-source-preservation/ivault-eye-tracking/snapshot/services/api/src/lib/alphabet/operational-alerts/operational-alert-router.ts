import type {
  OperationalAlertSignalInput,
  OperationalAlertTeam
} from "@/types/alphabet/operational-alert.types";

export function routeOperationalAlert(input: OperationalAlertSignalInput): {
  assignedTeam: OperationalAlertTeam;
  routeReason: string;
} {
  if (
    input.alertType === "provider_unknown_without_review" ||
    input.alertType === "provider_failure_without_compensation" ||
    input.alertType === "external_transfer_success_without_debit" ||
    input.alertType === "payout_stuck_pending"
  ) {
    return {
      assignedTeam: "payments",
      routeReason: "Payment-state alert routed to payments."
    };
  }

  if (
    input.alertType === "wallet_negative_balance" ||
    input.alertType === "ledger_without_execution" ||
    input.alertType === "reversal_without_original" ||
    input.alertType === "compensation_completed_without_reversal"
  ) {
    return {
      assignedTeam: "wallet_ops",
      routeReason: "Wallet/ledger invariant alert routed to wallet ops."
    };
  }

  if (
    input.alertType === "fraud_freeze_recommended" ||
    input.alertType === "dedupe_duplicate_spike" ||
    input.alertType === "suspicious_reward_velocity"
  ) {
    return {
      assignedTeam: "fraud",
      routeReason: "Fraud-risk alert routed to fraud."
    };
  }

  if (input.alertType === "review_sla_breached") {
    return {
      assignedTeam: "trust_safety",
      routeReason: "Review SLA alert routed to trust and safety."
    };
  }

  if (input.alertType === "campaign_budget_invariant_broken") {
    return {
      assignedTeam: "policy",
      routeReason: "Campaign budget invariant alert routed to policy."
    };
  }

  if (
    input.alertType === "worker_dead_lettered" ||
    input.alertType === "idempotency_conflict_spike" ||
    input.alertType === "audit_risk_high"
  ) {
    return {
      assignedTeam: "infra",
      routeReason: "System reliability alert routed to infrastructure."
    };
  }

  return {
    assignedTeam: "infra",
    routeReason: "Default operational alert route."
  };
}
