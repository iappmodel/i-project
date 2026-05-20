import { describe, expect, it } from "vitest";
import type { UValueImpactEvent } from "../../../types/alphabet/u-value.types";
import {
  applyUValueImpactEvent,
  calculateUValueTier,
  createDefaultUValueState
} from "../u-value-engine";

function makeEvent(
  overrides: Partial<UValueImpactEvent> = {}
): UValueImpactEvent {
  return {
    eventId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    eventType: "learning_verified",
    category: "learning",
    severity: "positive_medium",
    coinCode: "L",
    sourceEventId: null,
    objectType: null,
    objectId: null,
    confidence: 1,
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("u-value-engine", () => {
  it("default U Value starts at 0 tier 0", () => {
    const state = createDefaultUValueState(crypto.randomUUID());
    expect(state.uValueScore).toBe(0);
    expect(state.uValueTier).toBe(0);
  });

  it("calculates U Value tiers", () => {
    expect(calculateUValueTier(0)).toBe(0);
    expect(calculateUValueTier(15)).toBe(1);
    expect(calculateUValueTier(75)).toBe(2);
    expect(calculateUValueTier(250)).toBe(3);
    expect(calculateUValueTier(750)).toBe(4);
    expect(calculateUValueTier(2000)).toBe(5);
    expect(calculateUValueTier(5000)).toBe(6);
    expect(calculateUValueTier(10000)).toBe(7);
  });

  it("learning_verified increases U Value and learning score", () => {
    const userId = crypto.randomUUID();
    const state = createDefaultUValueState(userId);
    const event = makeEvent({
      userId,
      eventType: "learning_verified",
      category: "learning",
      severity: "positive_medium",
      coinCode: "L",
      confidence: 1
    });

    const result = applyUValueImpactEvent({
      previousState: state,
      event
    });

    expect(result.updated).toBe(true);
    expect(result.nextState.uValueScore).toBeGreaterThan(state.uValueScore);
    expect(result.nextState.learningScore).toBeGreaterThan(state.learningScore);
    expect(result.auditTrail.length).toBeGreaterThan(0);
  });

  it("help_verified increases U Value strongly", () => {
    const userId = crypto.randomUUID();
    const state = createDefaultUValueState(userId);
    const event = makeEvent({
      userId,
      eventType: "help_verified",
      category: "help",
      severity: "positive_large",
      coinCode: "H",
      confidence: 1
    });

    const result = applyUValueImpactEvent({
      previousState: state,
      event
    });

    expect(result.nextState.uValueScore).toBeGreaterThan(2);
    expect(result.nextState.helpScore).toBeGreaterThan(3);
  });

  it("noble_action_verified can trigger rare reward, protection and boost after thresholds", () => {
    const userId = crypto.randomUUID();
    let state = {
      ...createDefaultUValueState(userId),
      uValueScore: 749,
      safetyScore: 120,
      helpScore: 20,
      communityScore: 20
    };

    const event = makeEvent({
      userId,
      eventType: "noble_action_verified",
      category: "nobility",
      severity: "positive_rare",
      coinCode: "N",
      confidence: 1
    });

    const result = applyUValueImpactEvent({
      previousState: state,
      event
    });

    state = result.nextState;

    expect(state.uValueScore).toBeGreaterThanOrEqual(750);
    expect(state.rareRewardEligibility).toBe(true);
    expect(state.protectionEligibility).toBe(true);
    expect(state.boostEligibility).toBe(true);
  });

  it("fraud_detected sharply reduces U Value", () => {
    const userId = crypto.randomUUID();
    const state = {
      ...createDefaultUValueState(userId),
      uValueScore: 100,
      uValueTier: 2 as const
    };
    const event = makeEvent({
      userId,
      eventType: "fraud_detected",
      category: "system",
      severity: "negative_severe",
      coinCode: null,
      confidence: 1
    });

    const result = applyUValueImpactEvent({
      previousState: state,
      event
    });

    expect(result.nextState.uValueScore).toBeLessThan(80);
    expect(result.nextState.severeNegativeCount).toBe(1);
    expect(result.nextState.lifetimeNegativeEvents).toBe(1);
  });

  it("minor_safety_violation causes catastrophic damage", () => {
    const userId = crypto.randomUUID();
    const state = {
      ...createDefaultUValueState(userId),
      uValueScore: 500,
      uValueTier: 3 as const,
      safetyScore: 200
    };
    const event = makeEvent({
      userId,
      eventType: "minor_safety_violation",
      category: "safety",
      severity: "catastrophic",
      confidence: 1
    });

    const result = applyUValueImpactEvent({
      previousState: state,
      event
    });

    expect(result.nextState.uValueScore).toBeLessThan(450);
    expect(result.nextState.catastrophicNegativeCount).toBe(1);
    expect(result.nextState.safetyScore).toBeLessThan(state.safetyScore);
  });

  it("negative losses are stronger than positive gains", () => {
    const userId = crypto.randomUUID();
    const state = {
      ...createDefaultUValueState(userId),
      uValueScore: 100,
      uValueTier: 2 as const
    };
    const positive = makeEvent({
      userId,
      eventType: "attention_verified",
      category: "attention",
      severity: "positive_small",
      confidence: 1
    });

    const positiveResult = applyUValueImpactEvent({
      previousState: state,
      event: positive
    });

    const negative = makeEvent({
      userId,
      eventType: "low_quality_farming_detected",
      category: "quality",
      severity: "negative_medium",
      confidence: 1
    });

    const negativeResult = applyUValueImpactEvent({
      previousState: positiveResult.nextState,
      event: negative
    });

    const gain = positiveResult.nextState.uValueScore - state.uValueScore;
    const loss =
      positiveResult.nextState.uValueScore -
      negativeResult.nextState.uValueScore;

    expect(loss).toBeGreaterThan(gain);
  });

  it("userId mismatch does not update", () => {
    const state = createDefaultUValueState(crypto.randomUUID());
    const event = makeEvent({ userId: crypto.randomUUID() });

    const result = applyUValueImpactEvent({
      previousState: state,
      event
    });

    expect(result.updated).toBe(false);
  });

  it("audit trail records field deltas", () => {
    const userId = crypto.randomUUID();
    const state = createDefaultUValueState(userId);
    const event = makeEvent({
      userId,
      eventType: "learning_verified",
      category: "learning",
      severity: "positive_medium",
      confidence: 1
    });

    const result = applyUValueImpactEvent({
      previousState: state,
      event
    });

    const scoreAudit = result.auditTrail.find((item) => item.field === "uValueScore");
    expect(scoreAudit).toBeDefined();
    expect(scoreAudit?.delta).toBeGreaterThan(0);
  });
});
