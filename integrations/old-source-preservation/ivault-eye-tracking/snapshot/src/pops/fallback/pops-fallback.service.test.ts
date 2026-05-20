import { describe, expect, it } from "vitest";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE } from "../../../services/api/src/pops/types/pops.types";
import {
  POPS_REWARD_DECISION_STATUS,
  POPS_REWARD_HOLD_REASON,
  type PopsRewardDecision
} from "../../../services/api/src/pops/rewards/pops-reward-decision.types";
import {
  POPS_RECOMMENDED_ACTION,
  POPS_REWARD_ELIGIBILITY,
  POPS_TRUST_IMPACT,
  type PopsJudgment
} from "../../../services/api/src/pops/types/pops-decisions.types";
import {
  POPS_FALLBACK_FORBIDDEN_USER_PHRASES,
  POPS_FALLBACK_METHOD,
  POPS_FALLBACK_REASON,
  POPS_FALLBACK_REWARD_IMPACT,
  POPS_FALLBACK_USER_COPY,
  userCopyForMethod,
  type PopsFallbackEvaluationInput
} from "./pops-fallback.types";
import {
  applyFallbackToJudgment,
  applyFallbackToRewardDecision,
  evaluateAndSelectFallback,
  evaluateFallbackOptions,
  selectFallbackMethod
} from "./pops-fallback.service";
import { isFraudDominantForFallback } from "./pops-fallback-rules";

function baseInput(over: Partial<PopsFallbackEvaluationInput> = {}): PopsFallbackEvaluationInput {
  return {
    sessionId: "sess_1",
    userId: "user_1",
    fallbackReason: POPS_FALLBACK_REASON.VISUAL_SIGNAL_UNAVAILABLE,
    originalProofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
    fraudRisk: 0.1,
    visualRequirement: "optional",
    campaignAllowsFallbackPath: true,
    hasLocalEventBuffer: false,
    ...over
  };
}

function baseJudgment(): PopsJudgment {
  return {
    sessionId: "sess_1",
    userId: "user_1",
    sessionState: POPS_SESSION_STATE.ENGAGED_ACTIVE,
    presenceConfidence: 0.8,
    attentionConfidence: 0.75,
    intentConfidence: 0.7,
    continuityConfidence: 0.72,
    fraudRisk: 0.12,
    rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL,
    trustImpact: POPS_TRUST_IMPACT.NONE,
    recommendedAction: POPS_RECOMMENDED_ACTION.CONTINUE_TRACKING,
    reasonCodes: ["SCREEN_ACTIVE_VALID"],
    modelVersion: "pops-score-v1",
    ruleVersion: "pops-rules-v22",
    createdAt: new Date().toISOString()
  };
}

function baseReward(): PopsRewardDecision {
  return {
    id: "pops_reward_decision_test",
    sessionId: "sess_1",
    userId: "user_1",
    campaignId: "camp_1",
    contentId: "content_1",
    coinType: "ICOIN",
    baseAmount: 100,
    finalAmount: 100,
    decision: POPS_REWARD_DECISION_STATUS.PENDING_REVIEW,
    rewardQuality: 0.7,
    presenceConfidence: 0.8,
    attentionConfidence: 0.75,
    intentConfidence: 0.7,
    continuityConfidence: 0.72,
    fraudRisk: 0.12,
    holdRequired: false,
    holdReason: null,
    reasonCodes: [],
    walletTransactionIntent: null,
    createdAt: new Date().toISOString()
  };
}

describe("pops-fallback evaluate + select", () => {
  it("optional missing visual yields non-punitive redistribution path", () => {
    const input = baseInput({ visualRequirement: "optional", fraudRisk: 0.05 });
    const opts = evaluateFallbackOptions(input);
    expect(opts.length).toBeGreaterThan(0);
    expect(opts[0].rewardImpact).toBe(POPS_FALLBACK_REWARD_IMPACT.NONE);
    const decision = evaluateAndSelectFallback(input);
    expect(decision.fallbackMethod).toBe(POPS_FALLBACK_METHOD.SIMPLE_ATTENTION_CHECK);
    expect(decision.userVisibleMessage).toContain("P.O.P.S");
  });

  it("required visual with campaign fallback prefers low-friction dwell before review", () => {
    const input = baseInput({
      visualRequirement: "required",
      campaignAllowsFallbackPath: true,
      fraudRisk: 0.2
    });
    const decision = evaluateAndSelectFallback(input);
    expect([
      POPS_FALLBACK_METHOD.EXTRA_DWELL_TIME,
      POPS_FALLBACK_METHOD.MANUAL_CONFIRMATION_TAP,
      POPS_FALLBACK_METHOD.CONTENT_REPLAY_SEGMENT
    ]).toContain(decision.fallbackMethod);
  });

  it("restricts trust-based auto paths when fraud dominant", () => {
    const input = baseInput({
      fallbackReason: POPS_FALLBACK_REASON.DEVICE_LIMITATION,
      fraudRisk: 0.7
    });
    const opts = evaluateFallbackOptions(input);
    expect(opts.every((o) => o.fallbackMethod !== POPS_FALLBACK_METHOD.TRUST_BASED_APPROVAL)).toBe(true);
    expect(isFraudDominantForFallback(0.7)).toBe(true);
  });

  it("selectFallbackMethod respects preferred method when present", () => {
    const input = baseInput({ visualRequirement: "required", campaignAllowsFallbackPath: true });
    const options = evaluateFallbackOptions(input);
    const decision = selectFallbackMethod({
      ...input,
      options,
      preferredMethod: POPS_FALLBACK_METHOD.CONTENT_REPLAY_SEGMENT
    });
    expect(decision.fallbackMethod).toBe(POPS_FALLBACK_METHOD.CONTENT_REPLAY_SEGMENT);
  });
});

describe("pops-fallback judgment + reward merge", () => {
  it("applyFallbackToJudgment appends audit reason codes", () => {
    const input = baseInput({ visualRequirement: "optional" });
    const fb = evaluateAndSelectFallback(input);
    const next = applyFallbackToJudgment(baseJudgment(), fb);
    expect(next.reasonCodes.some((c) => c.includes("pops.fallback.applied"))).toBe(true);
    expect(next.reasonCodes).toEqual(expect.arrayContaining(fb.auditReasonCodes));
  });

  it("does not overturn DENIED_FRAUD_RISK reward decisions", () => {
    const reward = { ...baseReward(), decision: POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK, fraudRisk: 0.9 };
    const input = baseInput({ fallbackReason: POPS_FALLBACK_REASON.SCORING_UNAVAILABLE, scoringUnavailable: true });
    const fb = evaluateAndSelectFallback(input);
    const next = applyFallbackToRewardDecision(reward, fb);
    expect(next.decision).toBe(POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK);
    expect(next.reasonCodes.join(" ")).toContain("pops.fallback.applied");
  });

  it("blocks trust upgrade when fraud risk is high", () => {
    const reward = { ...baseReward(), decision: POPS_REWARD_DECISION_STATUS.PENDING_REVIEW, fraudRisk: 0.8 };
    const fb = evaluateAndSelectFallback(
      baseInput({ fallbackReason: POPS_FALLBACK_REASON.DEVICE_LIMITATION, fraudRisk: 0.8 })
    );
    const next = applyFallbackToRewardDecision(reward, fb);
    expect(next.decision).toBe(POPS_REWARD_DECISION_STATUS.PENDING_REVIEW);
    expect(next.holdRequired).toBe(true);
    expect(next.holdReason).toBe(POPS_REWARD_HOLD_REASON.FRAUD_RISK_MEDIUM);
  });
});

describe("pops-fallback user copy guardrails", () => {
  it("does not use forbidden accusatory phrases in user-visible strings", () => {
    const copies = [...Object.values(POPS_FALLBACK_USER_COPY)];
    for (const method of Object.values(POPS_FALLBACK_METHOD)) {
      copies.push(userCopyForMethod(method));
    }
    const lower = copies.map((c) => c.toLowerCase());
    for (const phrase of POPS_FALLBACK_FORBIDDEN_USER_PHRASES) {
      expect(lower.some((c) => c.includes(phrase))).toBe(false);
    }
  });
});
