import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelActionIntent,
  createActionIntentRecord,
  evaluateStoredActionIntent,
  getActionIntentEvaluationResult,
  getActionIntentRecord,
  listActionIntentRecords,
  resetActionIntentStoreForTests,
  updateActionIntentContext
} from "../action-intent-store";

function lowRisk() {
  return {
    ageRisk: 0.01,
    safetyRisk: 0.01,
    rightsRisk: 0.01,
    fraudRisk: 0.01,
    paymentRisk: 0.01,
    privacyRisk: 0.01,
    complianceRisk: 0.01,
    duplicateRisk: 0.01
  };
}

describe("action-intent-store", () => {
  beforeEach(() => {
    resetActionIntentStoreForTests();
  });

  function createBaseIntent() {
    return createActionIntentRecord({
      intentType: "withdraw",
      intentSource: "user",
      userId: crypto.randomUUID(),
      walletId: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      deviceId: crypto.randomUUID(),
      clientRequestId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      dedupeKey: crypto.randomUUID(),
      sourceEventIds: [crypto.randomUUID()],
      context: {
        surface: "wallet",
        objectType: "wallet",
        objectId: crypto.randomUUID(),
        amount: 25,
        coinCode: "I",
        regionCode: "US",
        ageBand: "18_plus",
        trustScore: 90,
        uValueScore: 40,
        walletStatus: "active"
      },
      riskSignals: lowRisk()
    });
  }

  it("creates action intent record", () => {
    const intent = createBaseIntent();

    expect(intent.status).toBe("intent_created");

    const stored = getActionIntentRecord(intent.actionIntentId);
    expect(stored?.actionIntentId).toBe(intent.actionIntentId);
  });

  it("updates context", () => {
    const intent = createBaseIntent();

    const updated = updateActionIntentContext({
      actionIntentId: intent.actionIntentId,
      context: {
        walletStatus: "restricted"
      }
    });

    expect(updated.status).toBe("context_captured");
    expect(updated.context.walletStatus).toBe("restricted");
  });

  it("cancels intent", () => {
    const intent = createBaseIntent();

    const canceled = cancelActionIntent(intent.actionIntentId);

    expect(canceled.status).toBe("canceled");
  });

  it("evaluates stored action intent", () => {
    const intent = createBaseIntent();

    const result = evaluateStoredActionIntent({
      actionIntentId: intent.actionIntentId,
      contextCaptured: true,
      policyRequested: true,
      sagaRequested: true,
      cancelRequested: false
    });

    expect(result.status).toBe("intent_ready");

    const updated = getActionIntentRecord(intent.actionIntentId);
    expect(updated?.status).toBe("accepted");

    const storedResult = getActionIntentEvaluationResult(intent.actionIntentId);
    expect(storedResult?.status).toBe("intent_ready");
  });

  it("lists action intents", () => {
    const intent = createBaseIntent();

    expect(listActionIntentRecords({ userId: intent.userId })).toHaveLength(1);
    expect(listActionIntentRecords({ intentType: "withdraw" })).toHaveLength(1);
  });

  it("detects duplicate intent", () => {
    const dedupeKey = "withdraw-1";

    createActionIntentRecord({
      intentType: "withdraw",
      intentSource: "user",
      userId: "user_1",
      walletId: "wallet_1",
      sessionId: "session_1",
      deviceId: "device_1",
      clientRequestId: "request_1",
      idempotencyKey: "idempotency_1",
      dedupeKey,
      context: {
        surface: "wallet",
        amount: 25,
        coinCode: "I",
        regionCode: "US",
        ageBand: "18_plus",
        walletStatus: "active"
      },
      riskSignals: lowRisk()
    });

    const duplicate = createActionIntentRecord({
      intentType: "withdraw",
      intentSource: "user",
      userId: "user_1",
      walletId: "wallet_1",
      sessionId: "session_1",
      deviceId: "device_1",
      clientRequestId: "request_2",
      idempotencyKey: "idempotency_2",
      dedupeKey,
      context: {
        surface: "wallet",
        amount: 25,
        coinCode: "I",
        regionCode: "US",
        ageBand: "18_plus",
        walletStatus: "active"
      },
      riskSignals: lowRisk()
    });

    const result = evaluateStoredActionIntent({
      actionIntentId: duplicate.actionIntentId,
      contextCaptured: true,
      policyRequested: true,
      sagaRequested: true,
      cancelRequested: false
    });

    expect(result.status).toBe("intent_duplicate");
  });
});
