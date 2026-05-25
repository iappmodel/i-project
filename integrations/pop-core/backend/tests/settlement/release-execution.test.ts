import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIXTURE_BASE_REWARD_MINOR,
  DEFAULT_FIXTURE_OFFER_ID
} from "../../settlement/offer-settlement-terms.js";
import {
  releaseApprovedEvent,
  releaseCompletedEvent
} from "../../settlement/pending-hold-release-lifecycle.js";
import {
  RELEASE_EXECUTION_BOUNDARY_V1,
  buildReleaseExecutionRecord,
  deriveReleaseExecutionRef,
  releaseStateFromExecutionRecord
} from "../../settlement/release-execution.js";
import {
  SETTLEMENT_AMOUNT_POLICY_V1,
  SETTLEMENT_APPROVED_MULTIPLIER_V1,
  SETTLEMENT_CURRENCY_V1
} from "../../settlement/settlement-amount.constants.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";

const SESSION_ID = "sess_release_execution_test";
const EXECUTED_AT = "2026-05-23T12:02:00.000Z";

describe("deriveReleaseExecutionRef", () => {
  it("returns release_{sessionId}_{amount}_{policyVersion}", () => {
    const hold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });

    expect(deriveReleaseExecutionRef(hold)).toBe(
      `release_${SESSION_ID}_100_${SETTLEMENT_AMOUNT_POLICY_V1}`
    );
  });

  it("throws when amount or amountBreakdown is null", () => {
    const hold = buildPendingHoldRecord({ amount: null, amountBreakdown: null });

    expect(() => deriveReleaseExecutionRef(hold)).toThrow(/requires non-null amount and amountBreakdown/);
  });
});

describe("buildReleaseExecutionRecord", () => {
  const hold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });
  const executionRef = deriveReleaseExecutionRef(hold);
  const approvedEvent = releaseApprovedEvent(SESSION_ID, { occurredAt: EXECUTED_AT });
  const completedEvent = releaseCompletedEvent(SESSION_ID, executionRef, {
    occurredAt: EXECUTED_AT
  });

  it("sets boundaryVersion correctly", () => {
    const record = buildReleaseExecutionRecord({
      hold,
      executionRef,
      releaseLifecycleEvents: [approvedEvent, completedEvent],
      executedAt: EXECUTED_AT
    });

    expect(record.boundaryVersion).toBe(RELEASE_EXECUTION_BOUNDARY_V1);
  });

  it("builds a released execution record with amount and breakdown snapshot", () => {
    const record = buildReleaseExecutionRecord({
      hold,
      executionRef,
      releaseLifecycleEvents: [approvedEvent, completedEvent],
      executedAt: EXECUTED_AT
    });

    expect(record).toEqual({
      boundaryVersion: RELEASE_EXECUTION_BOUNDARY_V1,
      executionRef,
      sessionId: SESSION_ID,
      offerId: DEFAULT_FIXTURE_OFFER_ID,
      amount: 100,
      currency: SETTLEMENT_CURRENCY_V1,
      amountBreakdown: {
        policyVersion: SETTLEMENT_AMOUNT_POLICY_V1,
        currency: SETTLEMENT_CURRENCY_V1,
        offerId: DEFAULT_FIXTURE_OFFER_ID,
        baseRewardMinor: DEFAULT_FIXTURE_BASE_REWARD_MINOR,
        statusMultiplier: SETTLEMENT_APPROVED_MULTIPLIER_V1,
        computedAmountMinor: 100,
        presenceUnits: null
      },
      releaseStatus: "released",
      releaseLifecycleEvents: [approvedEvent, completedEvent],
      executedAt: EXECUTED_AT
    });
    expect(record.amountBreakdown).not.toBe(hold.amountBreakdown);
  });

  it("rejects inconsistent amount and breakdown", () => {
    const inconsistentHold = buildPendingHoldRecord({
      sessionId: SESSION_ID,
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

    expect(() =>
      buildReleaseExecutionRecord({
        hold: inconsistentHold,
        executionRef: deriveReleaseExecutionRef(inconsistentHold),
        releaseLifecycleEvents: [approvedEvent, completedEvent],
        executedAt: EXECUTED_AT
      })
    ).toThrow(/amount to match amountBreakdown.computedAmountMinor/);
  });
});

describe("releaseStateFromExecutionRecord", () => {
  it("reconstructs release state from stored execution", () => {
    const hold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });
    const executionRef = deriveReleaseExecutionRef(hold);
    const approvedEvent = releaseApprovedEvent(SESSION_ID, { occurredAt: EXECUTED_AT });
    const completedEvent = releaseCompletedEvent(SESSION_ID, executionRef, {
      occurredAt: EXECUTED_AT
    });
    const record = buildReleaseExecutionRecord({
      hold,
      executionRef,
      releaseLifecycleEvents: [approvedEvent, completedEvent],
      executedAt: EXECUTED_AT
    });

    expect(releaseStateFromExecutionRecord(record)).toEqual({
      releaseStatus: "released",
      releaseLifecycleEvents: [approvedEvent, completedEvent]
    });
  });
});
