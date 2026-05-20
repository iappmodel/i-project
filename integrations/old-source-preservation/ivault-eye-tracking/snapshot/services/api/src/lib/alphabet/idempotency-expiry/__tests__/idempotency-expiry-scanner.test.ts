import { beforeEach, describe, expect, it, vi } from "vitest";

type PersistIdempotencyOutcome = Awaited<
  ReturnType<
    typeof import("../idempotency-expiry-store").evaluateAndPersistIdempotencyExpiry
  >
>;

const { stubPersistOutcome } = vi.hoisted(() => {
  function stubPersistOutcome(
    overrides: Partial<{
      evaluation: Record<string, unknown>;
      eventIds: string[];
    }> = {}
  ): PersistIdempotencyOutcome {
    return {
      result: {},
      evaluation: {
        failed: false,
        critical: false,
        ...overrides.evaluation
      },
      eventIds: overrides.eventIds ?? [],
      operationalAlert: null,
      manualReview: null
    } as unknown as PersistIdempotencyOutcome;
  }
  return { stubPersistOutcome };
});

vi.mock("../../db-repositories/idempotency-expiry.repository", () => ({
  fetchIdempotencyExpiryRowsDb: vi.fn(async () => []),
  fetchDedupeExpiryRowsDb: vi.fn(async () => [])
}));

vi.mock("../idempotency-expiry-store", () => ({
  evaluateAndPersistIdempotencyExpiry: vi.fn(async () => stubPersistOutcome())
}));

import {
  fetchDedupeExpiryRowsDb,
  fetchIdempotencyExpiryRowsDb
} from "../../db-repositories/idempotency-expiry.repository";
import { evaluateAndPersistIdempotencyExpiry } from "../idempotency-expiry-store";
import { classifyIdempotencyExpiryRow, runDedupeExpiryScan, runIdempotencyExpiryScan } from "../idempotency-expiry-scanner";

describe("idempotency-expiry-scanner", () => {
  beforeEach(() => {
    vi.mocked(fetchIdempotencyExpiryRowsDb).mockResolvedValue([]);
    vi.mocked(fetchDedupeExpiryRowsDb).mockResolvedValue([]);
    vi.mocked(evaluateAndPersistIdempotencyExpiry).mockImplementation(async () =>
      stubPersistOutcome()
    );
  });

  it("returns ok when no keys are scanned", async () => {
    const idem = await runIdempotencyExpiryScan({ limit: 50 });
    expect(idem.ok).toBe(true);
    expect(idem.scannedObjectCounts.idempotencyKeys).toBe(0);
    expect(idem.mutationCounts.expiryResultsCreated).toBe(0);
    expect(idem.reasonCodes).toContain("idempotency_expiry_scan_completed");

    const dedupe = await runDedupeExpiryScan({ limit: 50 });
    expect(dedupe.ok).toBe(true);
    expect(dedupe.scannedObjectCounts.dedupeKeys).toBe(0);
    expect(dedupe.reasonCodes).toContain("dedupe_expiry_scan_completed");
  });

  it("classifies idempotency conflict spike before stale", () => {
    const t = classifyIdempotencyExpiryRow({
      row: { conflict_count: 5, last_seen_at: "2020-01-01T00:00:00.000Z" },
      keyType: "idempotency",
      now: "2026-04-27T00:00:00.000Z"
    });
    expect(t).toBe("idempotency_key_conflict_spike");
  });

  it("aggregates failures when evaluations are critical", async () => {
    vi.mocked(fetchIdempotencyExpiryRowsDb).mockResolvedValueOnce([
      { idempotency_key: "k1", hit_count: 1, conflict_count: 0, replay_count: 0 }
    ] as never);
    vi.mocked(evaluateAndPersistIdempotencyExpiry).mockResolvedValueOnce(
      stubPersistOutcome({
        evaluation: { failed: false, critical: true },
        eventIds: ["e1"]
      })
    );

    const result = await runIdempotencyExpiryScan({ limit: 10 });
    expect(result.ok).toBe(false);
    expect(result.reasonCodes).toContain("idempotency_expiry_scan_completed_with_failures");
    expect(result.sourceEventIds).toContain("e1");
  });
});
