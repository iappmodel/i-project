import { describe, expect, it } from "vitest";
import { scorePopsSponsoredWatch } from "./pops-scoring-model-v1";
import type { PopsSession, PopsSessionAggregate } from "../types/pops.types";

function session(over: Partial<PopsSession> = {}): PopsSession {
  return {
    id: "s_clean",
    userId: "u1",
    sessionType: "SPONSORED_WATCH",
    proofLevel: "LEVEL_2_ATTENTION",
    state: "ACTIVE",
    startedAt: new Date(0).toISOString(),
    endedAt: new Date(45_000).toISOString(),
    requiredDurationMs: 30_000,
    requiredCompletionPct: 90,
    expectedReward: { coinType: "iCoin", amount: 0.25 },
    ...over,
  };
}

function aggregate(over: Partial<PopsSessionAggregate> = {}): PopsSessionAggregate {
  return {
    sessionId: "s_clean",
    userId: "u1",
    totalDurationMs: 45_000,
    activeDurationMs: 40_000,
    foregroundDurationMs: 45_000,
    backgroundDurationMs: 0,
    pausedDurationMs: 5000,
    contentProgressPct: 100,
    contentCompleted: true,
    pauseCount: 0,
    resumeCount: 0,
    tapCount: 2,
    scrollCount: 1,
    appBackgroundCount: 0,
    appForegroundCount: 0,
    screenActiveRatio: 0.95,
    appForegroundRatio: 1,
    progressWhileBackgrounded: false,
    completionTooFast: false,
    deviceIntegrityScore: 0.95,
    accountContinuityScore: 0.9,
    reasonCodes: [],
    ...over,
  };
}

describe("scorePopsSponsoredWatch", () => {
  it("clean sponsored watch: high presence/attention, low fraud, ELIGIBLE_FULL", () => {
    const s = session({ id: "s1" });
    const a = aggregate({ sessionId: "s1", userId: s.userId });
    const j = scorePopsSponsoredWatch({ session: s, aggregate: a });
    expect(j.presenceConfidence).toBeGreaterThanOrEqual(0.65);
    expect(j.attentionConfidence).toBeGreaterThanOrEqual(0.6);
    expect(j.fraudRisk).toBeLessThan(0.4);
    expect(j.rewardEligibility).toBe("ELIGIBLE_FULL");
    expect(j.reasonCodes).toContain("DURATION_REQUIREMENT_MET");
    expect(j.reasonCodes).toContain("COMPLETION_REQUIREMENT_MET");
  });

  it("background progress: raises fraud and holds or denies", () => {
    const s = session({ id: "s2" });
    const a = aggregate({
      sessionId: "s2",
      userId: s.userId,
      progressWhileBackgrounded: true,
      contentCompleted: true,
      contentProgressPct: 100,
    });
    const j = scorePopsSponsoredWatch({ session: s, aggregate: a });
    expect(j.reasonCodes).toContain("BACKGROUND_PROGRESS_DETECTED");
    expect(j.fraudRisk).toBeGreaterThanOrEqual(0.5);
    expect(["HELD_FOR_REVIEW", "DENIED"].includes(j.rewardEligibility)).toBe(true);
  });

  it("impossible completion speed: caps attention and spikes fraud", () => {
    const s = session({ id: "s3" });
    const a = aggregate({
      sessionId: "s3",
      userId: s.userId,
      activeDurationMs: 5000,
      totalDurationMs: 8000,
      pausedDurationMs: 0,
      backgroundDurationMs: 0,
      foregroundDurationMs: 8000,
      contentCompleted: true,
      contentProgressPct: 100,
      completionTooFast: true,
      screenActiveRatio: 0.9,
      appForegroundRatio: 1,
    });
    const j = scorePopsSponsoredWatch({ session: s, aggregate: a });
    expect(j.reasonCodes).toContain("IMPOSSIBLE_COMPLETION_SPEED");
    expect(j.attentionConfidence).toBeLessThanOrEqual(0.26);
    expect(j.fraudRisk).toBeGreaterThanOrEqual(0.75);
    expect(j.rewardEligibility).toBe("DENIED");
  });

  it("partial completion: includes PARTIAL_COMPLETION when below required pct", () => {
    const s = session({ id: "s4" });
    const a = aggregate({
      sessionId: "s4",
      userId: s.userId,
      contentProgressPct: 50,
      contentCompleted: false,
    });
    const j = scorePopsSponsoredWatch({ session: s, aggregate: a });
    expect(j.reasonCodes).toContain("PARTIAL_COMPLETION");
    expect(j.rewardEligibility).not.toBe("ELIGIBLE_FULL");
    expect(["ELIGIBLE_PARTIAL", "NOT_ELIGIBLE"].includes(j.rewardEligibility)).toBe(true);
  });
});
