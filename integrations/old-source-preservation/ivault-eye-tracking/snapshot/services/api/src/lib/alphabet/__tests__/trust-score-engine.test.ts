import { describe, expect, it } from "vitest";
import type { TrustImpactEvent } from "../../../types/alphabet/trust.types";
import {
  applyTrustImpactEvent,
  calculateTrustTier,
  createDefaultTrustScoreState
} from "../trust-score-engine";

function makeTrustEvent(
  overrides: Partial<TrustImpactEvent> = {}
): TrustImpactEvent {
  return {
    eventId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    eventType: "identity_verified",
    category: "identity",
    severity: "positive_large",
    sourceEventId: null,
    objectType: null,
    objectId: null,
    confidence: 1,
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("trust-score-engine", () => {
  it("default trust state starts at score 25 tier 1", () => {
    const userId = crypto.randomUUID();
    const state = createDefaultTrustScoreState(userId);

    expect(state.trustScore).toBe(25);
    expect(state.trustTier).toBe(1);
  });

  it("calculates trust tiers correctly", () => {
    expect(calculateTrustTier(0)).toBe(0);
    expect(calculateTrustTier(15)).toBe(1);
    expect(calculateTrustTier(35)).toBe(2);
    expect(calculateTrustTier(55)).toBe(3);
    expect(calculateTrustTier(75)).toBe(4);
    expect(calculateTrustTier(90)).toBe(5);
  });

  it("identity_verified increases trust and identity score", () => {
    const userId = crypto.randomUUID();
    const state = createDefaultTrustScoreState(userId);

    const event = makeTrustEvent({
      userId,
      eventType: "identity_verified",
      category: "identity",
      severity: "positive_large",
      confidence: 1
    });

    const result = applyTrustImpactEvent({
      previousState: state,
      event
    });

    expect(result.updated).toBe(true);
    expect(result.nextState.trustScore).toBeGreaterThan(state.trustScore);
    expect(result.nextState.identityScore).toBeGreaterThan(state.identityScore);
    expect(result.auditTrail.length).toBeGreaterThan(0);
  });

  it("fake_attention_detected decreases trust", () => {
    const userId = crypto.randomUUID();
    const state = createDefaultTrustScoreState(userId);

    const event = makeTrustEvent({
      userId,
      eventType: "fake_attention_detected",
      category: "attention",
      severity: "negative_medium",
      confidence: 1
    });

    const result = applyTrustImpactEvent({
      previousState: state,
      event
    });

    expect(result.nextState.trustScore).toBeLessThan(state.trustScore);
  });

  it("chargeback freezes withdrawals/conversions/creator monetization", () => {
    const userId = crypto.randomUUID();
    const state = createDefaultTrustScoreState(userId);

    const event = makeTrustEvent({
      userId,
      eventType: "chargeback_received",
      category: "payment",
      severity: "negative_severe",
      confidence: 1
    });

    const result = applyTrustImpactEvent({
      previousState: state,
      event
    });

    expect(result.flags.freezesWithdrawals).toBe(true);
    expect(result.flags.freezesConversions).toBe(true);
    expect(result.flags.freezesCreatorMonetization).toBe(true);
    expect(result.nextState.severeViolationCount).toBe(1);
  });

  it("minor_safety_violation causes catastrophic trust drop", () => {
    const userId = crypto.randomUUID();
    const state = {
      ...createDefaultTrustScoreState(userId),
      trustScore: 90,
      trustTier: 5 as const,
      safetyScore: 90
    };

    const event = makeTrustEvent({
      userId,
      eventType: "minor_safety_violation",
      category: "safety",
      severity: "catastrophic",
      confidence: 1
    });

    const result = applyTrustImpactEvent({
      previousState: state,
      event
    });

    expect(result.nextState.trustScore).toBeLessThan(20);
    expect(result.nextState.catastrophicViolationCount).toBe(1);
    expect(result.flags.requiresManualReview).toBe(true);
  });

  it("positive actions improve slowly", () => {
    const userId = crypto.randomUUID();
    const state = createDefaultTrustScoreState(userId);

    const event = makeTrustEvent({
      userId,
      eventType: "attention_verified_clean",
      category: "attention",
      severity: "positive_small",
      confidence: 1
    });

    const result = applyTrustImpactEvent({
      previousState: state,
      event
    });

    expect(result.nextState.trustScore - state.trustScore).toBeLessThan(1);
  });

  it("negative actions damage faster than positive actions repair", () => {
    const userId = crypto.randomUUID();
    const state = createDefaultTrustScoreState(userId);

    const positive = makeTrustEvent({
      userId,
      eventType: "attention_verified_clean",
      category: "attention",
      severity: "positive_small",
      confidence: 1
    });

    const positiveResult = applyTrustImpactEvent({
      previousState: state,
      event: positive
    });

    const negative = makeTrustEvent({
      userId,
      eventType: "fake_attention_detected",
      category: "attention",
      severity: "negative_medium",
      confidence: 1
    });

    const negativeResult = applyTrustImpactEvent({
      previousState: positiveResult.nextState,
      event: negative
    });

    const positiveGain = positiveResult.nextState.trustScore - state.trustScore;
    const negativeLoss =
      positiveResult.nextState.trustScore - negativeResult.nextState.trustScore;

    expect(negativeLoss).toBeGreaterThan(positiveGain);
  });

  it("userId mismatch does not update", () => {
    const state = createDefaultTrustScoreState(crypto.randomUUID());
    const event = makeTrustEvent({ userId: crypto.randomUUID() });

    const result = applyTrustImpactEvent({
      previousState: state,
      event
    });

    expect(result.updated).toBe(false);
  });

  it("audit trail records field deltas", () => {
    const userId = crypto.randomUUID();
    const state = createDefaultTrustScoreState(userId);
    const event = makeTrustEvent({ userId, eventType: "identity_verified" });
    const result = applyTrustImpactEvent({ previousState: state, event });

    const trustAudit = result.auditTrail.find((item) => item.field === "trustScore");
    expect(trustAudit).toBeDefined();
    expect(trustAudit?.before).toBe(25);
    expect(typeof trustAudit?.delta).toBe("number");
    expect(typeof trustAudit?.after).toBe("number");
  });
});
