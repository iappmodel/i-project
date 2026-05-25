import { describe, expect, it } from "vitest";
import { ProofReviewService } from "../../review/proof-review-service.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import {
  DEFAULT_FIXTURE_BASE_REWARD_MINOR,
  DEFAULT_FIXTURE_OFFER_ID
} from "../../settlement/offer-settlement-terms.js";
import { createPendingHoldFromReview } from "../../settlement/pending-hold-service.js";
import { PENDING_HOLD_RELEASE_ELIGIBILITY_REASON } from "../../settlement/pending-hold-release-eligibility.js";
import {
  RELEASE_EXECUTION_BOUNDARY_V1,
  deriveReleaseExecutionRef
} from "../../settlement/release-execution.js";
import {
  executePendingHoldRelease,
  ReleaseExecutionService
} from "../../settlement/release-execution-service.js";
import { InMemoryReleaseExecutionStore } from "../../settlement/release-execution-store.js";
import { InMemoryPendingHoldStore } from "../../settlement/pending-hold-store.js";
import {
  SETTLEMENT_AMOUNT_POLICY_V1,
  SETTLEMENT_APPROVED_MULTIPLIER_V1,
  SETTLEMENT_CURRENCY_V1
} from "../../settlement/settlement-amount.constants.js";
import { pp000001Packet } from "../fixtures/pp-000001-packet.js";
import { buildProofReviewRecord } from "../review/proof-review-store.contract.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";

const SESSION_ID = "sess_release_execution_service";
const EXECUTED_AT = "2026-05-23T12:02:00.000Z";
const OCCURRED_AT = "2026-05-23T12:02:00.000Z";

describe("executePendingHoldRelease", () => {
  it("executes eligible hold and returns released state with boundaryVersion", () => {
    const store = new InMemoryReleaseExecutionStore();
    const hold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });

    const result = executePendingHoldRelease(hold, {
      store,
      executedAt: EXECUTED_AT,
      occurredAt: OCCURRED_AT
    });

    expect(result.outcome).toBe("executed");
    expect(result.sessionId).toBe(SESSION_ID);
    expect(result.execution?.boundaryVersion).toBe(RELEASE_EXECUTION_BOUNDARY_V1);
    expect(result.execution?.executionRef).toBe(deriveReleaseExecutionRef(hold));
    expect(result.execution?.amount).toBe(100);
    expect(result.execution?.currency).toBe(SETTLEMENT_CURRENCY_V1);
    expect(result.execution?.amountBreakdown).toEqual(hold.amountBreakdown);
    expect(result.releaseState?.releaseStatus).toBe("released");
    expect(result.releaseState?.releaseLifecycleEvents.map((event) => event.type)).toEqual([
      "RELEASE_APPROVED",
      "RELEASE_COMPLETED"
    ]);
    expect(
      result.releaseState?.releaseLifecycleEvents.find((event) => event.type === "RELEASE_COMPLETED")
    ).toMatchObject({
      executionRef: deriveReleaseExecutionRef(hold)
    });
  });

  it("returns existing execution for duplicate sessionId", () => {
    const store = new InMemoryReleaseExecutionStore();
    const hold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });

    const first = executePendingHoldRelease(hold, { store, executedAt: EXECUTED_AT });
    const second = executePendingHoldRelease(hold, { store, executedAt: EXECUTED_AT });

    expect(first.outcome).toBe("executed");
    expect(second.outcome).toBe("existing");
    expect(second.execution).toBe(first.execution);
    expect(second.releaseState).toEqual(first.releaseState);
  });

  it("skips ineligible holds without writing to store", () => {
    const store = new InMemoryReleaseExecutionStore();
    const hold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: null, amountBreakdown: null });

    const result = executePendingHoldRelease(hold, { store });

    expect(result.outcome).toBe("skipped");
    expect(result.skipReason).toBe(PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.AMOUNT_MISSING);
    expect(result.execution).toBeUndefined();
    expect(store.getBySessionId(SESSION_ID)).toBeNull();
  });

  it.each([
    {
      name: "amount_zero",
      hold: buildPendingHoldRecord({
        sessionId: SESSION_ID,
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
      }),
      skipReason: PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.AMOUNT_ZERO
    },
    {
      name: "amount_breakdown_missing",
      hold: buildPendingHoldRecord({ sessionId: SESSION_ID, amountBreakdown: null }),
      skipReason: PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.AMOUNT_BREAKDOWN_MISSING
    },
    {
      name: "amount_breakdown_mismatch",
      hold: buildPendingHoldRecord({
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
      }),
      skipReason: PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.AMOUNT_BREAKDOWN_MISMATCH
    },
    {
      name: "offer_id_mismatch",
      hold: buildPendingHoldRecord({
        sessionId: SESSION_ID,
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
      }),
      skipReason: PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.OFFER_ID_MISMATCH
    },
    {
      name: "hold_not_pending",
      hold: { ...buildPendingHoldRecord({ sessionId: SESSION_ID }), status: "released" as never },
      skipReason: PENDING_HOLD_RELEASE_ELIGIBILITY_REASON.HOLD_NOT_PENDING
    }
  ])("skips $name holds", ({ hold, skipReason }) => {
    const store = new InMemoryReleaseExecutionStore();

    const result = executePendingHoldRelease(hold, { store });

    expect(result.outcome).toBe("skipped");
    expect(result.skipReason).toBe(skipReason);
    expect(store.getBySessionId(SESSION_ID)).toBeNull();
  });

  it("does not mutate PendingHoldRecord", () => {
    const store = new InMemoryReleaseExecutionStore();
    const hold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });
    const snapshot = structuredClone(hold);

    executePendingHoldRelease(hold, { store, executedAt: EXECUTED_AT });

    expect(hold).toEqual(snapshot);
    expect(hold.releaseStatus).toBe("not_released");
  });

  it("does not write PendingHoldStore", () => {
    const executionStore = new InMemoryReleaseExecutionStore();
    const holdStore = new InMemoryPendingHoldStore();
    const hold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });
    holdStore.save(hold);

    executePendingHoldRelease(hold, { store: executionStore, executedAt: EXECUTED_AT });

    expect(holdStore.getBySessionId(SESSION_ID)).toEqual(hold);
  });

  it("creates hold from review then executes release end-to-end", () => {
    const reviewStore = new InMemoryProofReviewStore();
    const holdStore = new InMemoryPendingHoldStore();
    const executionStore = new InMemoryReleaseExecutionStore();
    const reviewService = new ProofReviewService(reviewStore);

    const record = reviewService.submitProofPacketForReview(pp000001Packet, {
      artifactId: "PP-000001"
    });
    const holdResult = createPendingHoldFromReview(record, { store: holdStore });
    expect(holdResult.outcome).toBe("created");

    const releaseResult = executePendingHoldRelease(holdResult.hold!, {
      store: executionStore,
      executedAt: EXECUTED_AT
    });

    expect(releaseResult.outcome).toBe("executed");
    expect(releaseResult.execution?.boundaryVersion).toBe(RELEASE_EXECUTION_BOUNDARY_V1);
    expect(releaseResult.execution?.sessionId).toBe(record.sessionId);
    expect(releaseResult.releaseState?.releaseStatus).toBe("released");
  });
});

describe("ReleaseExecutionService", () => {
  it("delegates executePendingHoldRelease and lookup by sessionId", () => {
    const store = new InMemoryReleaseExecutionStore();
    const service = new ReleaseExecutionService(store);
    const hold = buildPendingHoldRecord({ sessionId: SESSION_ID, amount: 100 });

    const result = service.executePendingHoldRelease(hold, {
      executedAt: EXECUTED_AT,
      occurredAt: OCCURRED_AT
    });

    expect(result.outcome).toBe("executed");
    expect(service.getExecutionBySessionId(SESSION_ID)).toEqual(result.execution);
  });
});
