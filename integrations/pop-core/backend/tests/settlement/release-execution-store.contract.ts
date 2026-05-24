import { describe, expect, it } from "vitest";
import {
  releaseApprovedEvent,
  releaseCompletedEvent
} from "../../settlement/pending-hold-release-lifecycle.js";
import {
  RELEASE_EXECUTION_BOUNDARY_V1,
  buildReleaseExecutionRecord,
  deriveReleaseExecutionRef,
  type ReleaseExecutionRecord
} from "../../settlement/release-execution.js";
import {
  ReleaseExecutionConflictError,
  type ReleaseExecutionStore
} from "../../settlement/release-execution-store.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";

const EXECUTED_AT = "2026-05-23T12:02:00.000Z";

export function buildReleaseExecutionRecordFixture(
  overrides: {
    sessionId?: string;
    amount?: number;
  } = {}
): ReleaseExecutionRecord {
  const hold = buildPendingHoldRecord({
    sessionId: overrides.sessionId ?? "sess_release_execution_fixture",
    amount: overrides.amount ?? 100
  });
  const executionRef = deriveReleaseExecutionRef(hold);
  const approvedEvent = releaseApprovedEvent(hold.sessionId, { occurredAt: EXECUTED_AT });
  const completedEvent = releaseCompletedEvent(hold.sessionId, executionRef, {
    occurredAt: EXECUTED_AT
  });

  return buildReleaseExecutionRecord({
    hold,
    executionRef,
    releaseLifecycleEvents: [approvedEvent, completedEvent],
    executedAt: EXECUTED_AT
  });
}

export function runReleaseExecutionStoreContract(
  name: string,
  createStore: () => ReleaseExecutionStore
): void {
  describe(name, () => {
    it("saves and retrieves a record by sessionId", () => {
      const store = createStore();
      const record = buildReleaseExecutionRecordFixture();

      expect(store.save(record)).toBe(record);
      expect(store.getBySessionId(record.sessionId)).toEqual(record);
    });

    it("throws ReleaseExecutionConflictError for duplicate sessionId", () => {
      const store = createStore();
      const record = buildReleaseExecutionRecordFixture();

      store.save(record);

      expect(() => store.save(record)).toThrow(ReleaseExecutionConflictError);
      expect(() => store.save(record)).toThrow(
        `Release execution record already exists for sessionId: ${record.sessionId}`
      );
    });

    it("returns null for missing sessionId", () => {
      const store = createStore();
      store.save(buildReleaseExecutionRecordFixture());

      expect(store.getBySessionId("missing-session")).toBeNull();
    });

    it("persists boundaryVersion on saved records", () => {
      const store = createStore();
      const record = buildReleaseExecutionRecordFixture();

      store.save(record);

      expect(store.getBySessionId(record.sessionId)?.boundaryVersion).toBe(
        RELEASE_EXECUTION_BOUNDARY_V1
      );
    });
  });
}
