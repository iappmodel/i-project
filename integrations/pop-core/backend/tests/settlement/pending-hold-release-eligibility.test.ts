import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIXTURE_BASE_REWARD_MINOR,
  DEFAULT_FIXTURE_OFFER_ID
} from "../../settlement/offer-settlement-terms.js";
import {
  PENDING_HOLD_RELEASE_ELIGIBILITY_REASON,
  PendingHoldReleaseEligibilityError,
  assertReleaseEligible,
  isReleaseAmountConsistent,
  isReleaseEligible
} from "../../settlement/pending-hold-release-eligibility.js";
import {
  SETTLEMENT_AMOUNT_POLICY_V1,
  SETTLEMENT_APPROVED_MULTIPLIER_V1,
  SETTLEMENT_CURRENCY_V1,
  SETTLEMENT_PARTIAL_MULTIPLIER_V1
} from "../../settlement/settlement-amount.constants.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";

describe("isReleaseAmountConsistent", () => {
  it("returns true when amount matches breakdown and offerId", () => {
    const hold = buildPendingHoldRecord({ amount: 100 });
    expect(isReleaseAmountConsistent(hold)).toBe(true);
  });

  it("returns false when amount is null", () => {
    const hold = buildPendingHoldRecord({ amount: null, amountBreakdown: null });
    expect(isReleaseAmountConsistent(hold)).toBe(false);
  });
});

describe("isReleaseEligible", () => {
  it("passes for approved hold with amount 100", () => {
    const hold = buildPendingHoldRecord({ amount: 100 });
    expect(isReleaseEligible(hold)).toBe(true);
    expect(() => assertReleaseEligible(hold)).not.toThrow();
  });

  it("passes for partial hold with amount 50", () => {
    const amount = 50;
    const hold = buildPendingHoldRecord({
      amount,
      amountBreakdown: {
        policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
        currency: SETTLEMENT_CURRENCY_V1,
        offerId: DEFAULT_FIXTURE_OFFER_ID,
        baseRewardMinor: DEFAULT_FIXTURE_BASE_REWARD_MINOR,
        statusMultiplier: SETTLEMENT_PARTIAL_MULTIPLIER_V1,
        computedAmountMinor: amount,
        presenceUnits: null
      }
    });

    expect(isReleaseEligible(hold)).toBe(true);
  });

  it("fails amount_missing when amount is null", () => {
    const hold = buildPendingHoldRecord({ amount: null, amountBreakdown: null });
    expect(isReleaseEligible(hold)).toBe(false);
    expect(() => assertReleaseEligible(hold)).toThrow(PendingHoldReleaseEligibilityError);
    expect(() => assertReleaseEligible(hold)).toThrow(/amount_missing/);
  });

  it("fails amount_zero when amount is 0", () => {
    const hold = buildPendingHoldRecord({
      amount: 0,
      amountBreakdown: {
        policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
        currency: SETTLEMENT_CURRENCY_V1,
        offerId: DEFAULT_FIXTURE_OFFER_ID,
        baseRewardMinor: DEFAULT_FIXTURE_BASE_REWARD_MINOR,
        statusMultiplier: SETTLEMENT_APPROVED_MULTIPLIER_V1,
        computedAmountMinor: 0,
        presenceUnits: null
      }
    });

    expect(isReleaseEligible(hold)).toBe(false);
    expect(() => assertReleaseEligible(hold)).toThrow(/amount_zero/);
  });

  it("fails amount_breakdown_missing when amountBreakdown is null", () => {
    const hold = buildPendingHoldRecord({ amountBreakdown: null });
    expect(isReleaseEligible(hold)).toBe(false);
    expect(() => assertReleaseEligible(hold)).toThrow(/amount_breakdown_missing/);
  });

  it("fails amount_breakdown_mismatch when amount differs from computedAmountMinor", () => {
    const hold = buildPendingHoldRecord({
      amount: 100,
      amountBreakdown: {
        policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
        currency: SETTLEMENT_CURRENCY_V1,
        offerId: DEFAULT_FIXTURE_OFFER_ID,
        baseRewardMinor: DEFAULT_FIXTURE_BASE_REWARD_MINOR,
        statusMultiplier: SETTLEMENT_APPROVED_MULTIPLIER_V1,
        computedAmountMinor: 99,
        presenceUnits: null
      }
    });

    expect(isReleaseEligible(hold)).toBe(false);
    expect(() => assertReleaseEligible(hold)).toThrow(/amount_breakdown_mismatch/);
  });

  it("fails offer_id_mismatch when breakdown offerId differs from hold offerId", () => {
    const hold = buildPendingHoldRecord({
      offerId: DEFAULT_FIXTURE_OFFER_ID,
      amountBreakdown: {
        policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
        currency: SETTLEMENT_CURRENCY_V1,
        offerId: "other-offer",
        baseRewardMinor: DEFAULT_FIXTURE_BASE_REWARD_MINOR,
        statusMultiplier: SETTLEMENT_APPROVED_MULTIPLIER_V1,
        computedAmountMinor: 100,
        presenceUnits: null
      }
    });

    expect(isReleaseEligible(hold)).toBe(false);
    expect(() => assertReleaseEligible(hold)).toThrow(/offer_id_mismatch/);
  });

  it("includes hold_not_pending when status is not pending", () => {
    const hold = buildPendingHoldRecord({
      status: "pending"
    });
    expect(isReleaseEligible(hold)).toBe(true);

    const invalidHold = {
      ...hold,
      status: "released" as never
    };
    expect(isReleaseEligible(invalidHold)).toBe(false);
  });

  it("throws PendingHoldReleaseEligibilityError with reasonCodes", () => {
    const hold = buildPendingHoldRecord({ amount: null, amountBreakdown: null });

    try {
      assertReleaseEligible(hold);
      expect.fail("expected assertReleaseEligible to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PendingHoldReleaseEligibilityError);
      const eligibilityError = error as PendingHoldReleaseEligibilityError;
      expect(eligibilityError.reasonCodes).toContain(
        PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.AMOUNT_MISSING
      );
      expect(eligibilityError.reasonCodes).toContain(
        PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.AMOUNT_BREAKDOWN_MISSING
      );
    }
  });
});
