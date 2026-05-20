import { describe, expect, it, vi } from "vitest";
import type { StuckSagaPersistRow } from "../stuck-saga-scanner";

const emptyBundle = () => ({
  sagas: [],
  pipelines: [],
  executions: [],
  transfers: [],
  ledgers: [],
  reconciliations: [],
  compensations: [],
  reviews: []
});

const { mockDefaultPersistRow } = vi.hoisted(() => ({
  mockDefaultPersistRow: () =>
    ({
      result: { stuck_saga_result_id: "00000000-0000-0000-0000-000000000099" },
      evaluation: {
        failed: false,
        critical: false,
        warning: false,
        passed: true,
        skipped: false
      },
      eventIds: ["evt_scan_1"],
      operationalAlert: null,
      extraReviewCase: null
    }) as unknown as StuckSagaPersistRow
}));

vi.mock("../../db-repositories/stuck-saga.repository", () => ({
  fetchStuckSagaScanRowsDb: vi.fn(async () => emptyBundle())
}));

vi.mock("../stuck-saga-store", () => ({
  evaluateAndPersistStuckSaga: vi.fn(async () => mockDefaultPersistRow())
}));

import { fetchStuckSagaScanRowsDb } from "../../db-repositories/stuck-saga.repository";
import { evaluateAndPersistStuckSaga } from "../stuck-saga-store";
import { runStuckSagaScan } from "../stuck-saga-scanner";

describe("stuck-saga-scanner", () => {
  it("returns ok when scan bundle has no stuck candidates", async () => {
    vi.mocked(fetchStuckSagaScanRowsDb).mockResolvedValueOnce(emptyBundle());

    const result = await runStuckSagaScan({
      olderThanMinutes: 15,
      limit: 100
    });

    expect(result.ok).toBe(true);
    expect((result.resultPayload as { stuckResultsCreated: number }).stuckResultsCreated).toBe(0);
    expect(result.scannedObjectCounts.sagas).toBe(0);
    expect(result.reasonCodes).toContain("stuck_saga_scan_completed");
    expect(evaluateAndPersistStuckSaga).not.toHaveBeenCalled();
  });

  it("aggregates scan when saga row triggers detection", async () => {
    const sagaId = "11111111-1111-4111-8111-111111111111";
    vi.mocked(fetchStuckSagaScanRowsDb).mockResolvedValueOnce({
      sagas: [
        {
          saga_id: sagaId,
          saga_type: "payout",
          status: "saga_started",
          user_id: "22222222-2222-4222-8222-222222222222",
          wallet_id: null,
          content_id: null,
          campaign_id: null,
          grant_eligibility_id: null,
          source_action_intent_id: null,
          policy_decision_id: null,
          source_event_ids: [],
          idempotency_key: null,
          timeout_deadline: null,
          metadata: {},
          created_at: "2026-04-27T00:00:00.000Z",
          updated_at: "2026-04-27T00:00:00.000Z"
        }
      ],
      pipelines: [],
      executions: [],
      transfers: [],
      ledgers: [],
      reconciliations: [],
      compensations: [],
      reviews: []
    });

    vi.mocked(evaluateAndPersistStuckSaga).mockResolvedValueOnce({
      result: { stuck_saga_result_id: "33333333-3333-4333-8333-333333333333" },
      evaluation: {
        failed: true,
        critical: false,
        warning: false,
        passed: false,
        skipped: false
      },
      eventIds: ["e1", "e2"],
      operationalAlert: {
        ok: true,
        alert: { alert_id: "44444444-4444-4444-8444-444444444444" },
        evaluation: {},
        reviewCase: null,
        eventIds: [],
        reasonCodes: []
      },
      extraReviewCase: null
    } as unknown as StuckSagaPersistRow);

    const result = await runStuckSagaScan({ olderThanMinutes: 15, limit: 100 });

    expect(result.ok).toBe(false);
    expect((result.resultPayload as { stuckResultsCreated: number }).stuckResultsCreated).toBe(1);
    expect(result.createdAlertIds).toContain("44444444-4444-4444-8444-444444444444");
    expect(result.reasonCodes).toContain("stuck_saga_scan_completed_with_failures");
    expect(evaluateAndPersistStuckSaga).toHaveBeenCalledTimes(1);
  });
});
