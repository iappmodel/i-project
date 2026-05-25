import type { ProofReviewRecord } from "../review/proof-review-store.js";
import type { OfferSettlementTerms } from "./offer-settlement-terms.js";
import type { SettlementCurrency } from "./settlement-amount.constants.js";

export interface SettlementAmountBreakdown {
  policyVersion: string;
  currency: SettlementCurrency;
  offerId: string;
  baseRewardMinor: number;
  statusMultiplier: number;
  computedAmountMinor: number;
  /** Reserved for future POP presence-based economics. Not used by SETTLEMENT_AMOUNT_POLICY_V1. */
  presenceUnits?: number | null;
}

export interface SettlementAmountInput {
  record: ProofReviewRecord;
  terms: OfferSettlementTerms;
}

export interface SettlementAmountResult {
  breakdown: SettlementAmountBreakdown;
  computedAmountMinor: number;
}
