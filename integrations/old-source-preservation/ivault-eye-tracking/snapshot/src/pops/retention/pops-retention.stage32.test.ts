import { describe, expect, it } from "vitest";
import { PopsAnonymizationService } from "./pops-anonymization.service";
import { PopsDeletionService } from "./pops-deletion.service";
import { PopsRetentionPolicyService } from "./pops-retention-policy.service";
import {
  POPS_DATA_CATEGORY,
  RETENTION_REASON,
  type PopsDeletionBatchResult,
  type PopsRetentionDataStore,
  type PopsUserDataExport
} from "./pops-retention.types";
import { PopsRetentionWorker } from "./pops-retention.worker";

class MemoryRetentionStore implements PopsRetentionDataStore {
  readonly holds = new Set<string>();
  rawDeletedSessions = new Set<string>();
  batchesCleared: string[] = [];
  batchesMarkedAggregated: string[] = [];
  aggregationCutoffsSeen: string[] = [];
  eventsAnonymized: string[] = [];
  rawSweepIds: string[] = [];

  async sessionHasLegalHold(sessionId: string): Promise<boolean> {
    return this.holds.has(sessionId);
  }

  async listSessionIdsForUser(_userId: string): Promise<string[]> {
    return [];
  }

  async deleteSessionRawPayloads(sessionId: string): Promise<PopsDeletionBatchResult> {
    this.rawDeletedSessions.add(sessionId);
    return { affectedIds: [sessionId], skippedDueToHold: [], skippedFinancialLedger: [] };
  }

  async clearSignalBatchRawPayloadsOlderThan(_cutoffIso: string): Promise<PopsDeletionBatchResult> {
    return { affectedIds: [...this.batchesCleared], skippedDueToHold: [], skippedFinancialLedger: [] };
  }

  async markSignalBatchesAggregatedBefore(
    cutoffIso: string
  ): Promise<PopsDeletionBatchResult> {
    this.aggregationCutoffsSeen.push(cutoffIso);
    return {
      affectedIds: [...this.batchesMarkedAggregated],
      skippedDueToHold: [],
      skippedFinancialLedger: []
    };
  }

  async anonymizeEventsOlderThan(_cutoffIso: string): Promise<PopsDeletionBatchResult> {
    return { affectedIds: [...this.eventsAnonymized], skippedDueToHold: [], skippedFinancialLedger: [] };
  }

  async deleteOrAnonymizeRawSensitivePastPolicy(_nowIso: string): Promise<PopsDeletionBatchResult> {
    return { affectedIds: [...this.rawSweepIds], skippedDueToHold: [], skippedFinancialLedger: [] };
  }

  async applyLegalHold(sessionId: string, _reason: string, _atIso: string): Promise<void> {
    this.holds.add(sessionId);
  }

  async releaseLegalHold(sessionId: string, _atIso: string): Promise<void> {
    this.holds.delete(sessionId);
  }

  async loadUserExportSlices(userId: string): Promise<Omit<PopsUserDataExport, "exportedAt" | "exclusionsNote">> {
    return {
      userId,
      sessions: [{ id: "s1" }],
      judgments: [{ id: "j1" }],
      rewardDecisions: [{ id: "rd1", status: "APPROVED" }],
      walletRewardIntents: [{ id: "w1" }],
      privacyReceipts: [{ id: "p1", user_visible_summary: "Verified attention." }],
      disputes: [],
      userVisibleReasonSummaries: ["Eligible for reward."]
    };
  }

  async deleteUserOwnedEphemeralPopsData(userId: string): Promise<PopsDeletionBatchResult> {
    return { affectedIds: [userId], skippedDueToHold: [], skippedFinancialLedger: ["rd1"] };
  }
}

describe("P.O.P.S Stage 32 — retention policy", () => {
  const policy = new PopsRetentionPolicyService();

  it("uses 90d baseline for events under normal operation", () => {
    const days = policy.eventRetentionDays(new Set([RETENTION_REASON.NORMAL_OPERATION]));
    expect(days).toBe(90);
  });

  it("extends event retention for wallet settlement", () => {
    const days = policy.eventRetentionDays(
      new Set([RETENTION_REASON.NORMAL_OPERATION, RETENTION_REASON.WALLET_SETTLEMENT])
    );
    expect(days).toBeGreaterThanOrEqual(365);
  });

  it("clamps raw camera review retention between 7 and 30 days", () => {
    expect(policy.rawCameraReviewRetentionDays(3)).toBe(7);
    expect(policy.rawCameraReviewRetentionDays(60)).toBe(30);
    expect(policy.rawCameraReviewRetentionDays(14)).toBe(14);
  });

  it("flags financial ledger categories", () => {
    expect(policy.isFinancialLedgerCategory(POPS_DATA_CATEGORY.REWARD_DECISIONS)).toBe(true);
    expect(policy.isFinancialLedgerCategory(POPS_DATA_CATEGORY.EVENTS)).toBe(false);
  });
});

describe("P.O.P.S Stage 32 — anonymization", () => {
  it("redacts obvious PII keys in event payloads", () => {
    const svc = new PopsAnonymizationService();
    const out = svc.anonymizeEventPayload({
      id: "e1",
      payload: { user_email: "a@b.co", score: 0.5 }
    });
    expect(out.payload.user_email).toBe("[REDACTED]");
    expect(out.payload.score).toBe(0.5);
  });
});

describe("P.O.P.S Stage 32 — deletion + worker", () => {
  it("skips raw session delete when legal hold is active", async () => {
    const store = new MemoryRetentionStore();
    await store.applyLegalHold("sess-1", "LEGAL_HOLD", new Date().toISOString());
    const deletion = new PopsDeletionService({ store });
    const res = await deletion.deleteSessionRawData("sess-1");
    expect(res.skippedDueToHold).toContain("sess-1");
    expect(res.affectedIds.length).toBe(0);
  });

  it("blocks batch TTL purge when reasons include legal hold", async () => {
    const store = new MemoryRetentionStore();
    store.batchesCleared = ["b1"];
    const deletion = new PopsDeletionService({ store });
    const res = await deletion.deleteExpiredSignalBatches(
      new Set([RETENTION_REASON.LEGAL_HOLD])
    );
    expect(res.affectedIds.length).toBe(0);
    expect(res.skippedDueToHold).toContain("*");
    expect(store.aggregationCutoffsSeen.length).toBe(0);
  });

  it("marks signal batches aggregated before clearing raw payloads", async () => {
    const store = new MemoryRetentionStore();
    store.batchesCleared = ["b1"];
    const deletion = new PopsDeletionService({ store });
    await deletion.deleteExpiredSignalBatches();
    expect(store.aggregationCutoffsSeen.length).toBe(1);
  });

  it("exportUserPopsData includes summaries and exclusion note", async () => {
    const store = new MemoryRetentionStore();
    const deletion = new PopsDeletionService({ store });
    const pack = await deletion.exportUserPopsData("user-1");
    expect(pack.sessions.length).toBe(1);
    expect(pack.userVisibleReasonSummaries.length).toBeGreaterThan(0);
    expect(pack.exclusionsNote).toMatch(/Excluded from user export/);
  });

  it("deleteUserPopsData surfaces skipped ledger-linked ids", async () => {
    const store = new MemoryRetentionStore();
    const deletion = new PopsDeletionService({ store });
    const res = await deletion.deleteUserPopsData("user-1");
    expect(res.skippedFinancialLedger).toContain("rd1");
  });

  it("worker aggregates sweep results", async () => {
    const store = new MemoryRetentionStore();
    store.rawSweepIds = ["cam-1"];
    store.batchesCleared = ["bat-1"];
    store.eventsAnonymized = ["ev-1"];
    const deletion = new PopsDeletionService({ store });
    const worker = new PopsRetentionWorker({ deletion });
    const summary = await worker.runRetentionSweep();
    expect(summary.rawSensitive.affectedIds).toContain("cam-1");
    expect(summary.signalBatches.affectedIds).toContain("bat-1");
    expect(summary.eventsAnonymized.affectedIds).toContain("ev-1");
    expect(summary.errors.length).toBe(0);
  });
});
