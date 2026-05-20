import { describe, expect, it } from "vitest";
import { issueRewardFromVerifiedEvent } from "../reward-issuance-engine";
import type { AlphabetEvent } from "../../../types/alphabet/event.types";

function makeEvent(overrides: Partial<AlphabetEvent> = {}): AlphabetEvent {
  return {
    eventId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    coinCode: "A",
    eventType: "attention_verified",
    objectType: "campaign",
    objectId: crypto.randomUUID(),
    sourceContext: "earn",
    rawScore: 0.9,
    qualityScore: 0.8,
    trustScoreAtEvent: 75,
    riskScore: 0.1,
    ageBand: "18_plus",
    verificationStatus: "verified",
    metadata: {},
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("reward-issuance-engine", () => {
  it("does not issue for unverified event", () => {
    const event = makeEvent({ verificationStatus: "pending" });

    const result = issueRewardFromVerifiedEvent({
      walletId: crypto.randomUUID(),
      context: {
        event,
        trustScore: 75,
        trustTier: 3,
        qualityScore: 0.8,
        riskScore: 0.1,
        ageBand: "18_plus",
        hasBudgetSource: true
      }
    });

    expect(result.issued).toBe(false);
    expect(result.reason).toContain("not verified");
  });

  it("blocks high risk score", () => {
    const event = makeEvent();

    const result = issueRewardFromVerifiedEvent({
      walletId: crypto.randomUUID(),
      context: {
        event,
        trustScore: 75,
        trustTier: 3,
        qualityScore: 0.8,
        riskScore: 0.95,
        ageBand: "18_plus",
        hasBudgetSource: true
      }
    });

    expect(result.issued).toBe(false);
    expect(result.reason).toContain("Risk score");
  });

  it("blocks low quality score", () => {
    const event = makeEvent();

    const result = issueRewardFromVerifiedEvent({
      walletId: crypto.randomUUID(),
      context: {
        event,
        trustScore: 75,
        trustTier: 3,
        qualityScore: 0.1,
        riskScore: 0.1,
        ageBand: "18_plus",
        hasBudgetSource: true
      }
    });

    expect(result.issued).toBe(false);
    expect(result.reason).toContain("Quality score");
  });

  it("blocks missing budget source for funded rewards", () => {
    const event = makeEvent();

    const result = issueRewardFromVerifiedEvent({
      walletId: crypto.randomUUID(),
      context: {
        event,
        trustScore: 75,
        trustTier: 3,
        qualityScore: 0.8,
        riskScore: 0.1,
        ageBand: "18_plus",
        hasBudgetSource: false
      }
    });

    expect(result.issued).toBe(false);
    expect(result.reason).toContain("budget");
  });

  it("blocks underage work reward", () => {
    const event = makeEvent({
      coinCode: "W",
      eventType: "task_verified",
      sourceContext: "campaign",
      ageBand: "13_15"
    });

    const result = issueRewardFromVerifiedEvent({
      walletId: crypto.randomUUID(),
      context: {
        event,
        trustScore: 80,
        trustTier: 4,
        qualityScore: 0.8,
        riskScore: 0.1,
        ageBand: "13_15",
        hasBudgetSource: true
      }
    });

    expect(result.issued).toBe(false);
    expect(result.reason).toContain("age");
  });

  it("score_update creates ledger entry but no coin lot", () => {
    const event = makeEvent({
      coinCode: "K",
      eventType: "knowledge_verified",
      sourceContext: "learning",
      rawScore: 0.9,
      qualityScore: 0.9
    });

    const result = issueRewardFromVerifiedEvent({
      walletId: crypto.randomUUID(),
      context: {
        event,
        trustScore: 80,
        trustTier: 4,
        qualityScore: 0.9,
        riskScore: 0.1,
        ageBand: "18_plus",
        hasBudgetSource: false
      }
    });

    expect(result.issued).toBe(true);
    expect(result.coinLot).toBeUndefined();
    expect(result.ledgerEntry).toBeDefined();
    expect(result.rule?.issueMode).toBe("score_update");
  });
});
