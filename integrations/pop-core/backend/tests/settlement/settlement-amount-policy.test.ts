import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIXTURE_BASE_REWARD_MINOR,
  DEFAULT_FIXTURE_OFFER_ID,
  DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS,
  InMemoryOfferSettlementTermsProvider
} from "../../settlement/offer-settlement-terms.js";
import { computeSettlementAmount } from "../../settlement/settlement-amount-policy.js";
import {
  SETTLEMENT_AMOUNT_POLICY_V1,
  SETTLEMENT_APPROVED_MULTIPLIER_V1,
  SETTLEMENT_CURRENCY_V1,
  SETTLEMENT_PARTIAL_MULTIPLIER_V1
} from "../../settlement/settlement-amount.constants.js";
import { buildProofReviewRecord } from "../review/proof-review-store.contract.js";
import { buildPartialProofReviewRecord } from "./pending-hold-store.contract.js";

describe("computeSettlementAmount", () => {
  it("computes full amount for approved review", () => {
    const record = buildProofReviewRecord();

    const result = computeSettlementAmount({
      record,
      terms: DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS
    });

    expect(result.computedAmountMinor).toBe(100);
    expect(result.breakdown).toEqual({
      policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
      currency: SETTLEMENT_CURRENCY_V1,
      offerId: DEFAULT_FIXTURE_OFFER_ID,
      baseRewardMinor: DEFAULT_FIXTURE_BASE_REWARD_MINOR,
      statusMultiplier: SETTLEMENT_APPROVED_MULTIPLIER_V1,
      computedAmountMinor: 100,
      presenceUnits: null
    });
  });

  it("computes reduced amount for partial review", () => {
    const record = buildPartialProofReviewRecord();

    const result = computeSettlementAmount({
      record,
      terms: DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS
    });

    expect(result.computedAmountMinor).toBe(50);
    expect(result.breakdown).toEqual({
      policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
      currency: SETTLEMENT_CURRENCY_V1,
      offerId: DEFAULT_FIXTURE_OFFER_ID,
      baseRewardMinor: DEFAULT_FIXTURE_BASE_REWARD_MINOR,
      statusMultiplier: SETTLEMENT_PARTIAL_MULTIPLIER_V1,
      computedAmountMinor: 50,
      presenceUnits: null
    });
  });

  it("is deterministic for identical inputs", () => {
    const record = buildProofReviewRecord();
    const input = { record, terms: DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS };

    expect(computeSettlementAmount(input)).toEqual(computeSettlementAmount(input));
  });

  it("floors fractional minor units after multiply", () => {
    const record = buildPartialProofReviewRecord();
    const terms = {
      offerId: DEFAULT_FIXTURE_OFFER_ID,
      baseRewardMinor: 99,
      currency: SETTLEMENT_CURRENCY_V1
    };

    const result = computeSettlementAmount({ record, terms });

    expect(result.computedAmountMinor).toBe(49);
    expect(result.breakdown.computedAmountMinor).toBe(49);
  });

  it("throws for non-settlement-eligible review status", () => {
    const record = buildProofReviewRecord({
      status: "rejected",
      review: {
        ...buildProofReviewRecord().review,
        status: "rejected"
      }
    });

    expect(() =>
      computeSettlementAmount({
        record,
        terms: DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS
      })
    ).toThrow("Settlement amount policy cannot compute amount for status: rejected");
  });

  it("sets presenceUnits to null for SETTLEMENT_AMOUNT_POLICY_V1", () => {
    const record = buildProofReviewRecord();

    const result = computeSettlementAmount({
      record,
      terms: DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS
    });

    expect(result.breakdown.presenceUnits).toBeNull();
  });
});

describe("InMemoryOfferSettlementTermsProvider", () => {
  it("returns default fixture terms for nike-pegasus-41-watch", () => {
    const provider = new InMemoryOfferSettlementTermsProvider();

    expect(provider.getByOfferId(DEFAULT_FIXTURE_OFFER_ID)).toEqual(
      DEFAULT_FIXTURE_OFFER_SETTLEMENT_TERMS
    );
  });

  it("returns null for unknown offerId", () => {
    const provider = new InMemoryOfferSettlementTermsProvider();

    expect(provider.getByOfferId("unknown-offer")).toBeNull();
  });
});
