import { describe, expect, it } from "vitest";
import { evaluateActionIntent } from "../action-intent-engine";
import type { ActionIntentSignalInput } from "@/types/alphabet/action-intent.types";

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

function makeInput(overrides: Partial<ActionIntentSignalInput> = {}): ActionIntentSignalInput {
  return {
    actionIntentId: crypto.randomUUID(),

    intentType: "withdraw",
    intentSource: "user",
    currentStatus: "intent_created",

    userId: crypto.randomUUID(),
    actorUserId: null,
    creatorId: null,
    businessId: null,
    walletId: crypto.randomUUID(),
    contentId: null,
    campaignId: null,
    grantEligibilityId: null,

    sessionId: crypto.randomUUID(),
    deviceId: crypto.randomUUID(),
    clientRequestId: crypto.randomUUID(),

    idempotencyKey: crypto.randomUUID(),
    dedupeKey: crypto.randomUUID(),
    duplicateIntentCount: 0,

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

    riskSignals: lowRisk(),

    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    now: new Date().toISOString(),

    contextCaptured: true,
    policyRequested: true,
    sagaRequested: true,
    cancelRequested: false,

    metadata: {},
    ...overrides
  };
}

describe("action-intent-engine", () => {
  it("accepts clean withdrawal intent", () => {
    const result = evaluateActionIntent(makeInput());

    expect(result.status).toBe("intent_ready");
    expect(result.ready).toBe(true);
    expect(result.actionIntentAcceptedEvent?.eventType).toBe("action_intent_accepted");
  });

  it("requires wallet context for withdrawal", () => {
    const result = evaluateActionIntent(
      makeInput({
        walletId: null
      })
    );

    expect(result.status).toBe("intent_needs_context");
    expect(result.reasons).toContain("wallet_required");
  });

  it("requires amount for monetary intent", () => {
    const result = evaluateActionIntent(
      makeInput({
        context: {
          ...makeInput().context,
          amount: null
        }
      })
    );

    expect(result.status).toBe("intent_needs_context");
    expect(result.reasons).toContain("positive_amount_required");
  });

  it("blocks duplicate intent", () => {
    const result = evaluateActionIntent(
      makeInput({
        duplicateIntentCount: 1
      })
    );

    expect(result.status).toBe("intent_duplicate");
    expect(result.duplicate).toBe(true);
  });

  it("routes unknown age sensitive intent to policy", () => {
    const result = evaluateActionIntent(
      makeInput({
        context: {
          ...makeInput().context,
          ageBand: "unknown"
        }
      })
    );

    expect(result.status).toBe("intent_policy_required");
    expect(result.policyRequired).toBe(true);
  });

  it("rejects high-risk intent", () => {
    const result = evaluateActionIntent(
      makeInput({
        riskSignals: {
          ageRisk: 0.95,
          safetyRisk: 0.95,
          rightsRisk: 0.95,
          fraudRisk: 0.95,
          paymentRisk: 0.95,
          privacyRisk: 0.95,
          complianceRisk: 0.95,
          duplicateRisk: 0.95
        }
      })
    );

    expect(result.status).toBe("intent_rejected");
    expect(result.rejected).toBe(true);
  });

  it("expires old intent", () => {
    const result = evaluateActionIntent(
      makeInput({
        expiresAt: new Date(Date.now() - 60_000).toISOString()
      })
    );

    expect(result.status).toBe("intent_expired");
    expect(result.expired).toBe(true);
  });

  it("cancels intent", () => {
    const result = evaluateActionIntent(
      makeInput({
        cancelRequested: true
      })
    );

    expect(result.status).toBe("intent_canceled");
    expect(result.canceled).toBe(true);
  });

  it("requires admin source for admin command", () => {
    const result = evaluateActionIntent(
      makeInput({
        intentType: "admin_command",
        intentSource: "user",
        actorUserId: crypto.randomUUID(),
        walletId: null,
        context: {
          ...makeInput().context,
          amount: null,
          coinCode: null
        }
      })
    );

    expect(result.status).toBe("intent_rejected");
    expect(result.reasons).toContain("admin_action_requires_admin_or_moderator_source");
  });
});
