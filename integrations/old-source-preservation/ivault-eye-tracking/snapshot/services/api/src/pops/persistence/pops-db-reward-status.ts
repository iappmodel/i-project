import type { PopsRewardDecisionStatus } from "../rewards/pops-reward-decision.types";

/**
 * Maps product-level reward outcomes to Stage-14 DB `pops_reward_decisions.decision_status`.
 * Wallet ledger still settles separately; DB stores lifecycle for reconciliation.
 */
export type PopsDbRewardDecisionStatus =
  | "NO_REWARD"
  | "PENDING"
  | "PENDING_REVIEW"
  | "HELD"
  | "RELEASED"
  | "PARTIALLY_RELEASED"
  | "DENIED"
  | "EXPIRED";

export function mapRewardDecisionToDbStatus(status: PopsRewardDecisionStatus): PopsDbRewardDecisionStatus {
  switch (status) {
    case "APPROVED_FULL":
      return "PENDING";
    case "APPROVED_PARTIAL":
      return "PARTIALLY_RELEASED";
    case "PENDING_REVIEW":
      return "PENDING_REVIEW";
    case "HELD":
      return "HELD";
    case "DENIED_LOW_CONFIDENCE":
    case "DENIED_FRAUD_RISK":
    case "DENIED_INELIGIBLE":
    case "DENIED_DUPLICATE":
    case "DENIED_EXPIRED":
      return "DENIED";
    default:
      return "NO_REWARD";
  }
}

export function mapWalletIntentDbStatus(status: PopsRewardDecisionStatus): PopsDbRewardDecisionStatus {
  return mapRewardDecisionToDbStatus(status);
}
