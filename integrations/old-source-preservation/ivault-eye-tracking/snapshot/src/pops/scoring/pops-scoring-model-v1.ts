import type {
  PopsJudgment,
  PopsRecommendedAction,
  PopsSession,
  PopsSessionAggregate,
  PopsSessionState,
} from "../types/pops.types";
import type { PopsRewardEligibility } from "../types/pops-decisions.types";
import type { PopsReasonCode } from "../constants/pops-reason-codes";
import { addReason, clamp01, hasReason, scoreCompletion, scoreDuration } from "./pops-score-utils";
import { getPopsInternalSummary, getPopsUserSafeSummary } from "./pops-score-explainer";
import { createPopsId } from "../utils/pops-id";
import { nowIso } from "../utils/pops-time";

export function scorePopsSponsoredWatch(input: {
  session: PopsSession;
  aggregate: PopsSessionAggregate;
}): PopsJudgment {
  const { session, aggregate } = input;
  const requiredDurationMs = session.requiredDurationMs;
  const requiredCompletionPct = session.requiredCompletionPct;

  let reasonCodes: PopsReasonCode[] = [...aggregate.reasonCodes];
  if (aggregate.progressWhileBackgrounded) {
    reasonCodes = addReason(reasonCodes, "BACKGROUND_PROGRESS_DETECTED");
  }
  if (aggregate.completionTooFast) {
    reasonCodes = addReason(reasonCodes, "IMPOSSIBLE_COMPLETION_SPEED");
  }
  if (aggregate.deviceIntegrityScore < 0.5) {
    reasonCodes = addReason(reasonCodes, "DEVICE_INTEGRITY_WARNING");
  }
  if (aggregate.accountContinuityScore < 0.6) {
    reasonCodes = addReason(reasonCodes, "ACCOUNT_CONTINUITY_BREAK");
  }

  const screenActive = aggregate.screenActiveRatio * 0.3;
  const appForeground = aggregate.appForegroundRatio * 0.3;
  const durationScore = scoreDuration(aggregate.activeDurationMs, requiredDurationMs) * 0.2;
  const device = aggregate.deviceIntegrityScore * 0.1;
  const account = aggregate.accountContinuityScore * 0.1;
  let presence = clamp01(screenActive + appForeground + durationScore + device + account);

  if (hasReason(reasonCodes, "BACKGROUND_PROGRESS_DETECTED")) {
    presence = Math.min(presence, 0.55);
  }
  if (hasReason(reasonCodes, "DEVICE_INTEGRITY_WARNING")) {
    presence = Math.min(presence, 0.6);
  }
  if (hasReason(reasonCodes, "ACCOUNT_CONTINUITY_BREAK")) {
    presence = Math.min(presence, 0.65);
  }

  const completion = scoreCompletion(aggregate.contentProgressPct, requiredCompletionPct) * 0.45;
  const activeDwell = scoreDuration(aggregate.activeDurationMs, requiredDurationMs) * 0.25;
  const foregroundQuality = aggregate.appForegroundRatio * 0.15;
  const interactionNaturalness = aggregate.tapCount + aggregate.scrollCount > 0 ? 0.05 : 0.025;
  const interruptionQuality = aggregate.appBackgroundCount <= 1 ? 0.1 : 0.05;
  let attention = clamp01(completion + activeDwell + foregroundQuality + interactionNaturalness + interruptionQuality);

  if (aggregate.contentProgressPct < requiredCompletionPct) {
    attention = Math.min(attention, 0.7);
  }
  if (hasReason(reasonCodes, "BACKGROUND_PROGRESS_DETECTED")) {
    attention = Math.min(attention, 0.35);
  }
  if (hasReason(reasonCodes, "IMPOSSIBLE_COMPLETION_SPEED")) {
    attention = Math.min(attention, 0.25);
  }

  const intent =
    aggregate.contentCompleted &&
    !aggregate.progressWhileBackgrounded &&
    !aggregate.completionTooFast
      ? 0.4
      : 0.3;

  const sessionConsistency = aggregate.sessionConsistencyScore ?? 1;
  const continuity = clamp01(
    aggregate.deviceIntegrityScore * 0.5 +
      aggregate.accountContinuityScore * 0.4 +
      sessionConsistency * 0.1,
  );

  let fraudRisk = 0.05;
  if (hasReason(reasonCodes, "BACKGROUND_PROGRESS_DETECTED")) fraudRisk += 0.55;
  if (hasReason(reasonCodes, "IMPOSSIBLE_COMPLETION_SPEED")) fraudRisk += 0.7;
  if (hasReason(reasonCodes, "DEVICE_INTEGRITY_WARNING")) fraudRisk += 0.35;
  if (hasReason(reasonCodes, "ACCOUNT_CONTINUITY_BREAK")) fraudRisk += 0.35;
  fraudRisk = clamp01(fraudRisk);

  const offerRequirementsMet =
    aggregate.activeDurationMs >= requiredDurationMs &&
    aggregate.contentProgressPct >= requiredCompletionPct &&
    aggregate.contentCompleted &&
    !aggregate.progressWhileBackgrounded &&
    !aggregate.completionTooFast;

  let rewardEligibility: PopsRewardEligibility;
  if (fraudRisk >= 0.75) {
    rewardEligibility = "DENIED";
  } else if (fraudRisk >= 0.5) {
    rewardEligibility = "HELD_FOR_REVIEW";
  } else if (
    offerRequirementsMet &&
    presence >= 0.65 &&
    attention >= 0.6 &&
    fraudRisk < 0.4
  ) {
    rewardEligibility = "ELIGIBLE_FULL";
  } else if (presence >= 0.5 && attention >= 0.5 && fraudRisk < 0.5) {
    rewardEligibility = "ELIGIBLE_PARTIAL";
  } else {
    rewardEligibility = "NOT_ELIGIBLE";
  }

  let recommendedAction: PopsRecommendedAction;
  switch (rewardEligibility) {
    case "ELIGIBLE_FULL":
      recommendedAction = "APPROVE_REWARD";
      break;
    case "ELIGIBLE_PARTIAL":
      recommendedAction = "PARTIAL_REWARD";
      break;
    case "HELD_FOR_REVIEW":
      recommendedAction = "HOLD_REWARD";
      break;
    default:
      recommendedAction = "DENY_REWARD";
  }

  let sessionState: PopsSessionState;
  if (rewardEligibility === "ELIGIBLE_FULL" || rewardEligibility === "ELIGIBLE_PARTIAL") {
    sessionState = "COMPLETED";
  } else if (rewardEligibility === "HELD_FOR_REVIEW") {
    sessionState = "REWARD_HELD";
  } else {
    sessionState = "REWARD_DENIED";
  }

  if (aggregate.screenActiveRatio >= 0.8) {
    reasonCodes = addReason(reasonCodes, "SCREEN_ACTIVE_VALID");
  }
  if (aggregate.appForegroundRatio >= 0.8) {
    reasonCodes = addReason(reasonCodes, "APP_FOREGROUND_VALID");
  }
  if (aggregate.contentProgressPct > 0) {
    reasonCodes = addReason(reasonCodes, "CONTENT_PROGRESS_VALID");
  }
  if (aggregate.activeDurationMs >= requiredDurationMs) {
    reasonCodes = addReason(reasonCodes, "DURATION_REQUIREMENT_MET");
  }
  if (aggregate.contentProgressPct >= requiredCompletionPct) {
    reasonCodes = addReason(reasonCodes, "COMPLETION_REQUIREMENT_MET");
  }
  if (aggregate.contentCompleted) {
    reasonCodes = addReason(reasonCodes, "VALID_COMPLETION");
  }
  if (fraudRisk < 0.15) {
    reasonCodes = addReason(reasonCodes, "LOW_FRAUD_RISK");
  }
  if (aggregate.deviceIntegrityScore >= 0.8) {
    reasonCodes = addReason(reasonCodes, "DEVICE_INTEGRITY_VALID");
  }
  if (aggregate.accountContinuityScore >= 0.8) {
    reasonCodes = addReason(reasonCodes, "ACCOUNT_CONTINUITY_VALID");
  }

  if (aggregate.contentProgressPct > 0 && aggregate.contentProgressPct < requiredCompletionPct) {
    reasonCodes = addReason(reasonCodes, "PARTIAL_COMPLETION");
  }
  if (aggregate.activeDurationMs < requiredDurationMs) {
    reasonCodes = addReason(reasonCodes, "LOW_DWELL_TIME");
  }
  if (aggregate.tapCount + aggregate.scrollCount === 0) {
    reasonCodes = addReason(reasonCodes, "LOW_INTERACTION_DENSITY");
  }

  if (aggregate.progressWhileBackgrounded) {
    reasonCodes = addReason(reasonCodes, "BACKGROUND_PROGRESS_DETECTED");
  }
  if (aggregate.completionTooFast) {
    reasonCodes = addReason(reasonCodes, "IMPOSSIBLE_COMPLETION_SPEED");
  }
  if (aggregate.deviceIntegrityScore < 0.5) {
    reasonCodes = addReason(reasonCodes, "DEVICE_INTEGRITY_WARNING");
  }
  if (aggregate.accountContinuityScore < 0.6) {
    reasonCodes = addReason(reasonCodes, "ACCOUNT_CONTINUITY_BREAK");
  }
  if (fraudRisk >= 0.75) {
    reasonCodes = addReason(reasonCodes, "HIGH_FRAUD_RISK");
  }

  const judgmentDraft: Pick<
    PopsJudgment,
    | "rewardEligibility"
    | "presenceConfidence"
    | "attentionConfidence"
    | "intentConfidence"
    | "continuityConfidence"
    | "fraudRisk"
  > = {
    rewardEligibility,
    presenceConfidence: clamp01(presence),
    attentionConfidence: clamp01(attention),
    intentConfidence: clamp01(intent),
    continuityConfidence: clamp01(continuity),
    fraudRisk: clamp01(fraudRisk),
  };

  const judgment: PopsJudgment = {
    id: createPopsId("pops_judgment"),
    sessionId: session.id,
    userId: session.userId,
    sessionState,
    presenceConfidence: judgmentDraft.presenceConfidence,
    attentionConfidence: judgmentDraft.attentionConfidence,
    intentConfidence: judgmentDraft.intentConfidence,
    continuityConfidence: judgmentDraft.continuityConfidence,
    fraudRisk: judgmentDraft.fraudRisk,
    rewardEligibility: judgmentDraft.rewardEligibility,
    recommendedAction,
    reasonCodes,
    userSafeSummary: getPopsUserSafeSummary(judgmentDraft),
    internalSummary: getPopsInternalSummary({
      ...judgmentDraft,
      reasonCodes,
    }),
    createdAt: nowIso(),
  };

  return judgment;
}

/** Lightweight V1 score bundle used by unit tests and live session preview. */
export interface PopsScoringModelV1Result {
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  continuityConfidence: number;
  fraudRisk: number;
  reasonCodes: PopsReasonCode[];
}

export function scorePopsModelV1(input: {
  progressPct: number;
  screenActive: boolean;
  appForeground: boolean;
  durationValid: boolean;
  continuityConfidence?: number;
  activeDwellScore: number;
  interruptionScore: number;
  pauseResumeNaturalnessScore: number;
  backgroundProgressDetected: boolean;
  impossibleCompletionDetected: boolean;
  deviceIntegrityLow?: boolean;
}): PopsScoringModelV1Result {
  const reasonCodes: PopsReasonCode[] = [];
  let fraudRisk = 0.05;
  if (input.backgroundProgressDetected) {
    fraudRisk = 0.65;
    reasonCodes.push("BACKGROUND_PROGRESS_DETECTED");
  }
  if (input.impossibleCompletionDetected) {
    fraudRisk = 0.8;
    reasonCodes.push("IMPOSSIBLE_COMPLETION");
  }
  if (input.deviceIntegrityLow) {
    fraudRisk = Math.max(fraudRisk, 0.45);
    if (!reasonCodes.includes("DEVICE_INTEGRITY_WARNING")) {
      reasonCodes.push("DEVICE_INTEGRITY_WARNING");
    }
  }

  const continuity = clamp01(input.continuityConfidence ?? 0.75);
  const presence = clamp01(
    0.55 * (input.screenActive ? 1 : 0.65) * (input.appForeground ? 1 : 0.7) * (input.durationValid ? 1 : 0.55) +
      0.25 * continuity,
  );
  const attention = clamp01(
    0.35 * clamp01(input.progressPct) +
      0.25 * input.activeDwellScore +
      0.15 * (input.appForeground ? 1 : 0.55) +
      0.15 * input.interruptionScore +
      0.1 * input.pauseResumeNaturalnessScore,
  );
  const intent = clamp01(0.35 + 0.45 * clamp01(input.progressPct) * (input.durationValid ? 1 : 0.4));

  return {
    presenceConfidence: presence,
    attentionConfidence: attention,
    intentConfidence: intent,
    continuityConfidence: continuity,
    fraudRisk: clamp01(fraudRisk),
    reasonCodes,
  };
}
