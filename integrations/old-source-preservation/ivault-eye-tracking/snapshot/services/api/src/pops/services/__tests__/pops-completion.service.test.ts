import { describe, expect, it } from "vitest";
import { PopsCompletionService } from "../pops-completion.service";
import {
  InMemoryPopsEventRepository,
  InMemoryPopsJudgmentRepository,
  InMemoryPopsPrivacyReceiptRepository,
  InMemoryPopsRewardDecisionRepository,
  InMemoryPopsSessionRepository,
  InMemoryPopsTransaction,
  InMemoryPopsWalletIntentRepository
} from "../../../server/pops/repositories/pops-in-memory.repositories";

describe("PopsCompletionService", () => {
  it("holds wallet intent when privacy receipt creation fails", async () => {
    const sessions = new InMemoryPopsSessionRepository();
    const events = new InMemoryPopsEventRepository();
    const batches = events;
    const judgments = new InMemoryPopsJudgmentRepository();
    const decisions = new InMemoryPopsRewardDecisionRepository();
    const wallets = new InMemoryPopsWalletIntentRepository();
    const privacy = new InMemoryPopsPrivacyReceiptRepository();

    const transaction = new InMemoryPopsTransaction([
      { snapshot: () => sessions.snapshot(), restore: (value) => sessions.restore(value) },
      { snapshot: () => events.snapshot(), restore: (value) => events.restore(value) },
      { snapshot: () => judgments.snapshot(), restore: (value) => judgments.restore(value) },
      { snapshot: () => decisions.snapshot(), restore: (value) => decisions.restore(value) },
      { snapshot: () => wallets.snapshot(), restore: (value) => wallets.restore(value) }
    ]);

    await sessions.createSession({
      id: "session-1",
      user_id: "user-1",
      device_id: "device-1",
      session_type: "FEED_VIEW",
      proof_level: "LEVEL_1_SESSION",
      state: "DETECTING",
      started_at: new Date().toISOString(),
      metadata: {}
    });

    await events.insertEventsDeduped([
      {
        session_id: "session-1",
        user_id: "user-1",
        event_id: "evt-1",
        event_type: "attention.session.started",
        source: "client",
        client_timestamp_ms: Date.now(),
        payload: {}
      }
    ]);
    await batches.insertSignalBatchDeduped({
      session_id: "session-1",
      user_id: "user-1",
      batch_id: "batch-1",
      client_timestamp_ms: Date.now(),
      window_start_ms: Date.now() - 1000,
      window_end_ms: Date.now(),
      signals: { visualPresenceScore: 0.9, screenActiveRatio: 0.8, contentProgressDeltaPct: 80, accountContinuityScore: 0.7, deviceIntegrityScore: 0.9 }
    });

    // Fail privacy creation once to exercise hold path.
    const createPrivacyReceipt = privacy.createPrivacyReceipt.bind(privacy);
    let first = true;
    privacy.createPrivacyReceipt = async (row) => {
      if (first) {
        first = false;
        throw new Error("privacy_write_failed");
      }
      return createPrivacyReceipt(row);
    };

    const service = new PopsCompletionService(
      sessions,
      events,
      batches,
      judgments,
      decisions,
      wallets,
      privacy,
      {
        emit: async () => undefined
      } as any,
      transaction
    );

    const result = await service.completeSession("session-1", "user-1");
    expect(result.finalState).toBe("COMPLETED");
    expect((result.walletIntent as Record<string, unknown>).status).toBe("HELD_PRIVACY_RECEIPT_FAILED");
  });
});
