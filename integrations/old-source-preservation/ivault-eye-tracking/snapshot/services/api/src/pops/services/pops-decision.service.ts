import { POPS_PROOF_THRESHOLDS } from "../constants/pops.constants";
import {
  POPS_RECOMMENDED_ACTION,
  POPS_REWARD_ELIGIBILITY,
  POPS_TRUST_IMPACT,
  type PopsDecisionInput,
  type PopsJudgment,
  type PopsRecommendedAction,
  type PopsRewardDecision,
  type PopsRewardEligibility,
  type PopsTrustImpact
} from "../types/pops-decisions.types";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE } from "../types/pops.types";
import {
  bundleToJudgmentVersionFields,
  resolveJudgmentRuleVersion,
  resolvePopsVersionBundle
} from "../versioning/pops-version-resolver";

function nowIso(): string {
  return new Date().toISOString();
}

function judgmentStateFromInput(input: PopsDecisionInput): PopsJudgment["sessionState"] {
  if (input.fraudRisk >= 0.75) return POPS_SESSION_STATE.FRAUD_LIKELY;
  if (input.fraudRisk >= 0.5) return POPS_SESSION_STATE.SUSPICIOUS;
  if (input.presenceConfidence < 0.35 || input.attentionConfidence < 0.25) {
    return POPS_SESSION_STATE.DEGRADED;
  }
  if (input.state === POPS_SESSION_STATE.NOT_STARTED || input.state === POPS_SESSION_STATE.INITIALIZING) {
    return POPS_SESSION_STATE.DETECTING;
  }
  return input.state;
}

export class PopsDecisionService {
  evaluate(input: PopsDecisionInput): PopsRewardDecision {
    const thresholds =
      POPS_PROOF_THRESHOLDS[input.proofLevel] ?? POPS_PROOF_THRESHOLDS[POPS_PROOF_LEVEL.LEVEL_1_SESSION];

    let rewardEligibility: PopsRewardEligibility = POPS_REWARD_ELIGIBILITY.NOT_ELIGIBLE;
    let recommendedAction: PopsRecommendedAction = POPS_RECOMMENDED_ACTION.CONTINUE_TRACKING;
    let trustImpact: PopsTrustImpact = POPS_TRUST_IMPACT.NONE;
    const reasonCodes = [...input.reasonCodes];

    const continuityRequired = typeof thresholds.minimumContinuity === "number";
    const continuityOk = !continuityRequired || input.continuityConfidence >= (thresholds.minimumContinuity ?? 0);
    const presenceOk = input.presenceConfidence >= thresholds.minimumPresence;
    const attentionOk = input.attentionConfidence >= thresholds.minimumAttention;
    const intentOk = input.intentConfidence >= thresholds.minimumIntent;
    const fraudExceeded = input.fraudRisk > thresholds.maximumFraudRisk;

    if (fraudExceeded) {
      if (input.fraudRisk >= 0.85) {
        rewardEligibility = POPS_REWARD_ELIGIBILITY.DENIED;
        recommendedAction = POPS_RECOMMENDED_ACTION.DENY_REWARD;
        trustImpact = POPS_TRUST_IMPACT.NEGATIVE_HIGH;
        reasonCodes.push("fraud_threshold_critical");
      } else {
        rewardEligibility = POPS_REWARD_ELIGIBILITY.HELD_FOR_REVIEW;
        recommendedAction = POPS_RECOMMENDED_ACTION.HOLD_REWARD;
        trustImpact = POPS_TRUST_IMPACT.NEGATIVE_MEDIUM;
        reasonCodes.push("fraud_threshold_exceeded");
      }
    } else if (presenceOk && attentionOk && intentOk && continuityOk) {
      rewardEligibility = POPS_REWARD_ELIGIBILITY.ELIGIBLE_FULL;
      recommendedAction = POPS_RECOMMENDED_ACTION.APPROVE_REWARD;
      trustImpact = POPS_TRUST_IMPACT.POSITIVE_MEDIUM;
      reasonCodes.push("all_thresholds_met");
    } else if (presenceOk && (attentionOk || intentOk)) {
      rewardEligibility = POPS_REWARD_ELIGIBILITY.ELIGIBLE_PARTIAL;
      recommendedAction = POPS_RECOMMENDED_ACTION.PARTIAL_REWARD;
      trustImpact = POPS_TRUST_IMPACT.POSITIVE_LOW;
      reasonCodes.push("partial_thresholds_met");
    } else if (input.presenceConfidence < thresholds.minimumPresence * 0.75) {
      rewardEligibility = POPS_REWARD_ELIGIBILITY.NOT_ELIGIBLE;
      recommendedAction = POPS_RECOMMENDED_ACTION.REQUIRE_REVERIFICATION;
      reasonCodes.push("presence_too_low");
    } else {
      rewardEligibility = POPS_REWARD_ELIGIBILITY.ELIGIBLE_PENDING;
      recommendedAction = POPS_RECOMMENDED_ACTION.CONTINUE_TRACKING;
      reasonCodes.push("confidence_pending");
    }

    if (input.state === POPS_SESSION_STATE.DEGRADED || input.state === POPS_SESSION_STATE.UNCERTAIN) {
      recommendedAction =
        rewardEligibility === POPS_REWARD_ELIGIBILITY.NOT_ELIGIBLE
          ? POPS_RECOMMENDED_ACTION.REQUIRE_REVERIFICATION
          : POPS_RECOMMENDED_ACTION.DEGRADE_CONFIDENCE;
      reasonCodes.push("sensor_quality_degraded");
    }

    if (input.fraudRisk >= 0.5 && trustImpact === POPS_TRUST_IMPACT.NONE) {
      trustImpact = POPS_TRUST_IMPACT.NEGATIVE_LOW;
    }

    return {
      id: `pops_reward_decision_${crypto.randomUUID()}`,
      sessionId: input.sessionId,
      userId: input.userId,
      proofLevel: input.proofLevel,
      sessionState: judgmentStateFromInput(input),
      rewardEligibility,
      trustImpact,
      recommendedAction,
      reasonCodes,
      createdAt: nowIso()
    };
  }

  toJudgment(input: PopsDecisionInput, decision: PopsRewardDecision): PopsJudgment {
    const resolverInput = {
      sessionAt: decision.createdAt,
      campaignId: null,
      region: "GLOBAL" as const,
      appVersion: "1.0.0",
      featureFlags: {}
    };
    const bundle = resolvePopsVersionBundle(resolverInput);
    const jv = bundleToJudgmentVersionFields(bundle, resolveJudgmentRuleVersion(resolverInput));
    return {
      sessionId: input.sessionId,
      userId: input.userId,
      sessionState: decision.sessionState,
      presenceConfidence: input.presenceConfidence,
      attentionConfidence: input.attentionConfidence,
      intentConfidence: input.intentConfidence,
      continuityConfidence: input.continuityConfidence,
      fraudRisk: input.fraudRisk,
      rewardEligibility: decision.rewardEligibility,
      trustImpact: decision.trustImpact,
      recommendedAction: decision.recommendedAction,
      reasonCodes: decision.reasonCodes,
      modelVersion: jv.scoringModelVersion,
      ruleVersion: jv.ruleVersion,
      scoringModelVersion: jv.scoringModelVersion,
      fraudModelVersion: jv.fraudModelVersion,
      rewardFormulaVersion: jv.rewardFormulaVersion,
      privacyPolicyVersion: jv.privacyPolicyVersion,
      campaignRequirementVersion: jv.campaignRequirementVersion,
      createdAt: decision.createdAt
    };
  }
}
