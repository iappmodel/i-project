import { describe, expect, it } from "vitest";
import { createPopsRewardDecision } from "./pops-reward-decision.service";
import type { PopsJudgment, PopsSession } from "../types/pops.types";

const baseSession: PopsSession = {
  id: "session_1",
  userId: "user_1",
  sessionType: "SPONSORED_WATCH",
  proofLevel: "LEVEL_2_ATTENTION",
  state: "ACTIVE",
  startedAt: new Date().toISOString(),
  requiredDurationMs: 30_000,
  requiredCompletionPct: 90,
  expectedReward: { coinType: "iCoin", amount: 0.25 },
};

function judgment(partial: Partial<PopsJudgment>): PopsJudgment {
  const now = new Date().toISOString();
  return {
    id: "judgment_1",
    sessionId: baseSession.id,
    userId: baseSession.userId,
    sessionState: "COMPLETED",
    presenceConfidence: 0.85,
    attentionConfidence: 0.85,
    intentConfidence: 0.4,
    continuityConfidence: 0.82,
    fraudRisk: 0.05,
    rewardEligibility: "ELIGIBLE_FULL",
    recommendedAction: "APPROVE_REWARD",
    reasonCodes: [],
    userSafeSummary: "Moment verified.",
    internalSummary: "",
    createdAt: now,
    ...partial,
  };
}

describe("createPopsRewardDecision", () => {
  it("denies when fraud risk is very high", () => {
    const d = createPopsRewardDecision({
      session: baseSession,
      judgment: judgment({ fraudRisk: 0.8, rewardEligibility: "DENIED" }),
    });
    expect(d.decisionStatus).toBe("DENIED_FRAUD_RISK");
    expect(d.finalAmount).toBe(0);
  });

  it("holds when fraud risk is moderate", () => {
    const d = createPopsRewardDecision({
      session: baseSession,
      judgment: judgment({ fraudRisk: 0.65, rewardEligibility: "HELD_FOR_REVIEW" }),
    });
    expect(d.decisionStatus).toBe("HELD");
    expect(d.holdRequired).toBe(true);
    expect(d.finalAmount).toBeGreaterThan(0);
  });

  it("approves full on ELIGIBLE_FULL and low fraud", () => {
    const d = createPopsRewardDecision({
      session: baseSession,
      judgment: judgment({ fraudRisk: 0.05, rewardEligibility: "ELIGIBLE_FULL" }),
    });
    expect(d.decisionStatus).toBe("APPROVED_FULL");
    expect(d.finalAmount).toBe(0.25);
  });

  it("approves partial on ELIGIBLE_PARTIAL", () => {
    const d = createPopsRewardDecision({
      session: baseSession,
      judgment: judgment({
        fraudRisk: 0.05,
        rewardEligibility: "ELIGIBLE_PARTIAL",
        presenceConfidence: 0.55,
        attentionConfidence: 0.55,
      }),
    });
    expect(d.decisionStatus).toBe("APPROVED_PARTIAL");
    expect(d.finalAmount).toBeGreaterThan(0);
    expect(d.finalAmount).toBeLessThanOrEqual(0.25);
  });
});
