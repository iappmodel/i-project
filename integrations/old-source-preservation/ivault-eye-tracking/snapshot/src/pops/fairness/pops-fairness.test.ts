import { describe, expect, it } from "vitest";
import {
  POPS_RECOMMENDED_ACTION,
  POPS_REWARD_ELIGIBILITY,
  POPS_TRUST_IMPACT,
  type PopsJudgment
} from "../../../services/api/src/pops/types/pops-decisions.types";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE, POPS_SESSION_TYPE } from "../../../services/api/src/pops/types/pops.types";
import type { PopsSession } from "../../../services/api/src/pops/types/pops.types";
import { getCampaignRequirementFromPreset } from "../campaigns/pops-campaign-requirements.service";
import {
  POPS_CAMPAIGN_PROOF_PRESET,
  POPS_MANUAL_REVIEW_POLICY
} from "../campaigns/pops-campaign-requirements.types";
import { POPS_ACCESSIBILITY_MODE, POPS_FAIRNESS_REASON_CODE } from "./pops-fairness.types";
import { assessFairnessRisks } from "./pops-bias-risk-checker";
import { applyFairnessAdjustments, scoreWithAccessibilitySafeMode } from "./pops-fairness-adjustments";
import { judgmentIndicatesHardFraud } from "./pops-accessibility-policy";
import { popsAccessibilityMessageForReasons } from "./pops-accessibility-copy";
import { POPS_REASON_CODES } from "../scoring/pops-reason-code-engine";

function baseSession(over: Partial<PopsSession> = {}): PopsSession {
  return {
    id: "sess_1",
    userId: "user_1",
    deviceId: "dev_1",
    contentId: null,
    campaignId: "camp_1",
    sessionType: POPS_SESSION_TYPE.FEED_VIEW,
    proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION,
    state: POPS_SESSION_STATE.ENGAGED_ACTIVE,
    startedAt: new Date().toISOString(),
    endedAt: null,
    requiredDurationMs: 30_000,
    minimumPresenceConfidence: 0.5,
    minimumAttentionConfidence: 0.5,
    minimumIntentConfidence: 0.4,
    maximumFraudRisk: 0.85,
    metadata: {},
    ...over
  };
}

function baseJudgment(over: Partial<PopsJudgment> = {}): PopsJudgment {
  return {
    sessionId: "sess_1",
    userId: "user_1",
    sessionState: POPS_SESSION_STATE.ENGAGED_ACTIVE,
    presenceConfidence: 0.55,
    attentionConfidence: 0.5,
    intentConfidence: 0.5,
    continuityConfidence: 0.45,
    fraudRisk: 0.35,
    rewardEligibility: POPS_REWARD_ELIGIBILITY.DENIED,
    trustImpact: POPS_TRUST_IMPACT.NONE,
    recommendedAction: POPS_RECOMMENDED_ACTION.DENY_REWARD,
    reasonCodes: ["LOW_CONFIDENCE"],
    modelVersion: "v1",
    ruleVersion: "v1",
    createdAt: new Date().toISOString(),
    ...over
  };
}

describe("P.O.P.S Stage 29 — fairness and accessibility", () => {
  it("does not apply fairness when hard fraud signals are present", () => {
    const judgment = baseJudgment({
      reasonCodes: [POPS_REASON_CODES.negative.IMPOSSIBLE_COMPLETION_SPEED],
      fraudRisk: 0.95,
      recommendedAction: POPS_RECOMMENDED_ACTION.DENY_REWARD
    });
    expect(judgmentIndicatesHardFraud(judgment)).toBe(true);
    const campaign = getCampaignRequirementFromPreset("camp_1", POPS_CAMPAIGN_PROOF_PRESET.BASIC_VIEW);
    const out = applyFairnessAdjustments({
      session: baseSession(),
      signalAvailability: {
        visual: "unavailable",
        motion: "available",
        touch: "available",
        audioFeatures: "not_applicable",
        deviceSensorQuality: "low"
      },
      accessibilityContext: { modes: [POPS_ACCESSIBILITY_MODE.SCREEN_READER_ACTIVE] },
      campaignRequirements: campaign,
      judgment
    });
    expect(out.appliedAdjustments.length).toBe(0);
    expect(out.fairnessReasonCodes.length).toBe(0);
    expect(out.adjustedJudgment.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.DENIED);
  });

  it("converts denial to held-for-review when manual review is allowed and context warrants", () => {
    const campaign = getCampaignRequirementFromPreset("camp_1", POPS_CAMPAIGN_PROOF_PRESET.BASIC_VIEW);
    const req = { ...campaign, manualReviewPolicy: POPS_MANUAL_REVIEW_POLICY.ENABLED };
    const out = applyFairnessAdjustments({
      session: baseSession(),
      signalAvailability: {
        visual: "degraded",
        motion: "available",
        touch: "available",
        audioFeatures: "not_applicable",
        deviceSensorQuality: "low",
        environmentStress: "high"
      },
      accessibilityContext: { modes: [POPS_ACCESSIBILITY_MODE.REDUCED_MOTION] },
      campaignRequirements: req,
      judgment: baseJudgment()
    });
    expect(out.adjustedJudgment.rewardEligibility).toBe(POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW);
    expect(out.fairnessReasonCodes).toContain(POPS_FAIRNESS_REASON_CODE.REVIEW_USED_INSTEAD_OF_DENIAL);
  });

  it("assessFairnessRisks flags visual dependency when screen reader and visual-heavy campaign", () => {
    const campaign = getCampaignRequirementFromPreset("camp_1", POPS_CAMPAIGN_PROOF_PRESET.HIGH_VALUE_REWARD);
    const risks = assessFairnessRisks({
      session: baseSession(),
      signalAvailability: {
        visual: "unavailable",
        motion: "available",
        touch: "available",
        audioFeatures: "not_applicable",
        deviceSensorQuality: "high"
      },
      accessibilityContext: { modes: [POPS_ACCESSIBILITY_MODE.SCREEN_READER_ACTIVE] },
      campaignRequirements: { ...campaign, visualPresenceRequired: true }
    });
    expect(risks).toContain("VISUAL_DEPENDENCY_RISK");
  });

  it("scoreWithAccessibilitySafeMode mirrors applyFairnessAdjustments", () => {
    const campaign = getCampaignRequirementFromPreset("camp_1", POPS_CAMPAIGN_PROOF_PRESET.BASIC_VIEW);
    const input = {
      session: baseSession(),
      signalAvailability: {
        visual: "available",
        motion: "degraded",
        touch: "degraded",
        audioFeatures: "not_applicable",
        deviceSensorQuality: "medium"
      },
      accessibilityContext: { modes: [POPS_ACCESSIBILITY_MODE.SWITCH_CONTROL] },
      campaignRequirements: { ...campaign, manualReviewPolicy: POPS_MANUAL_REVIEW_POLICY.DISABLED },
      judgment: baseJudgment({
        rewardEligibility: POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING,
        recommendedAction: POPS_RECOMMENDED_ACTION.CONTINUE_TRACKING
      })
    };
    expect(scoreWithAccessibilitySafeMode(input).fairnessReasonCodes).toEqual(
      applyFairnessAdjustments(input).fairnessReasonCodes
    );
  });

  it("user copy stays non-clinical", () => {
    const msg = popsAccessibilityMessageForReasons([POPS_FAIRNESS_REASON_CODE.ACCESSIBILITY_SAFE_MODE_APPLIED]);
    expect(msg).toContain("P.O.P.S adjusted verification");
    expect(msg.toLowerCase()).not.toContain("disab");
    expect(msg.toLowerCase()).not.toContain("autism");
  });

  it("duplicate reward attempt still blocks fairness softening", () => {
    const judgment = baseJudgment({
      reasonCodes: [POPS_REASON_CODES.negative.DUPLICATE_REWARD_ATTEMPT]
    });
    expect(judgmentIndicatesHardFraud(judgment)).toBe(true);
  });
});
