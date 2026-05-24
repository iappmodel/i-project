import type { ProofReviewStatus } from "../types/proof-packet-v0.types.js";
import {
  SETTLEMENT_AMOUNT_POLICY_V1,
  SETTLEMENT_APPROVED_MULTIPLIER_V1,
  SETTLEMENT_PARTIAL_MULTIPLIER_V1
} from "./settlement-amount.constants.js";
import type {
  SettlementAmountBreakdown,
  SettlementAmountInput,
  SettlementAmountResult
} from "./settlement-amount.types.js";

function statusMultiplierFor(status: ProofReviewStatus): number {
  switch (status) {
    case "approved":
      return SETTLEMENT_APPROVED_MULTIPLIER_V1;
    case "partial":
      return SETTLEMENT_PARTIAL_MULTIPLIER_V1;
    default:
      throw new Error(`Settlement amount policy cannot compute amount for status: ${status}`);
  }
}

export function computeSettlementAmount(input: SettlementAmountInput): SettlementAmountResult {
  const { record, terms } = input;
  const statusMultiplier = statusMultiplierFor(record.status);
  const computedAmountMinor = Math.floor(terms.baseRewardMinor * statusMultiplier);

  const breakdown: SettlementAmountBreakdown = {
    policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
    currency: terms.currency,
    offerId: terms.offerId,
    baseRewardMinor: terms.baseRewardMinor,
    statusMultiplier,
    computedAmountMinor,
    presenceUnits: null
  };

  return { breakdown, computedAmountMinor };
}
