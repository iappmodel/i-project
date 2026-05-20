import {
  POPS_RECOMMENDED_ACTION,
  POPS_TRUST_IMPACT,
  type PopsJudgment,
  type PopsRewardEligibility,
  type PopsTrustImpact
} from "../../../services/api/src/pops/types/pops-decisions.types";
import type { PopsProofLevel } from "../../../services/api/src/pops/types/pops.types";
import {
  POPS_REWARD_DECISION_STATUS,
  POPS_REWARD_HOLD_REASON,
  type PopsRewardDecision,
  type PopsRewardDecisionStatus
} from "../../../services/api/src/pops/rewards/pops-reward-decision.types";
import {
  POPS_STORED_FEATURE_TYPE,
  type PopsStoredFeatureType
} from "../../../services/api/src/pops/privacy/pops-privacy-receipt.types";
import {
  POPS_FALLBACK_METHOD,
  POPS_FALLBACK_REASON,
  POPS_FALLBACK_REASON_CODES,
  POPS_FALLBACK_REWARD_IMPACT,
  POPS_FALLBACK_USER_COPY,
  userCopyForMethod,
  type PopsFallbackDecision,
  type PopsFallbackEvaluationInput,
  type PopsFallbackOption,
  type PopsFallbackSelectionInput
} from "./pops-fallback.types";
import { collectFallbackOptionsForReason } from "./pops-fallback-rules";

function nowIso(): string {
  return new Date().toISOString();
}

function createFallbackDecisionId(): string {
  return `pops_fallback_decision_${crypto.randomUUID()}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function trustImpactForDecision(
  rewardImpact: PopsFallbackDecision["rewardImpact"],
  method: PopsFallbackDecision["fallbackMethod"]
): PopsTrustImpact {
  if (rewardImpact === POPS_FALLBACK_REWARD_IMPACT.REWARD_DENIED) return POPS_TRUST_IMPACT.NEGATIVE_LOW;
  if (method === POPS_FALLBACK_METHOD.TRUST_BASED_APPROVAL) return POPS_TRUST_IMPACT.POSITIVE_LOW;
  if (rewardImpact === POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED) return POPS_TRUST_IMPACT.NONE;
  return POPS_TRUST_IMPACT.NONE;
}

function proofLevelForFallback(original: PopsProofLevel, method: PopsFallbackDecision["fallbackMethod"]): PopsProofLevel {
  if (method === POPS_FALLBACK_METHOD.NO_REWARD_SAFE_CLOSE) return original;
  return original;
}

function recommendedActionForMethod(method: PopsFallbackDecision["fallbackMethod"]): PopsJudgment["recommendedAction"] {
  switch (method) {
    case POPS_FALLBACK_METHOD.EXTRA_DWELL_TIME:
    case POPS_FALLBACK_METHOD.MANUAL_CONFIRMATION_TAP:
    case POPS_FALLBACK_METHOD.SIMPLE_ATTENTION_CHECK:
    case POPS_FALLBACK_METHOD.CONTENT_REPLAY_SEGMENT:
    case POPS_FALLBACK_METHOD.CTA_CONFIRMATION:
    case POPS_FALLBACK_METHOD.QR_CONFIRMATION:
    case POPS_FALLBACK_METHOD.MERCHANT_CONFIRMATION:
      return POPS_RECOMMENDED_ACTION.REQUIRE_INTERACTION;
    case POPS_FALLBACK_METHOD.DELAYED_REVIEW:
    case POPS_FALLBACK_METHOD.ADMIN_REVIEW:
      return POPS_RECOMMENDED_ACTION.HOLD_REWARD;
    case POPS_FALLBACK_METHOD.PARTIAL_REWARD:
      return POPS_RECOMMENDED_ACTION.PARTIAL_REWARD;
    case POPS_FALLBACK_METHOD.TRUST_BASED_APPROVAL:
      return POPS_RECOMMENDED_ACTION.APPROVE_REWARD;
    case POPS_FALLBACK_METHOD.NO_REWARD_SAFE_CLOSE:
      return POPS_RECOMMENDED_ACTION.DENY_REWARD;
  }
}

function rewardEligibilityAfterFallback(
  current: PopsRewardEligibility,
  rewardImpact: PopsFallbackDecision["rewardImpact"]
): PopsRewardEligibility {
  switch (rewardImpact) {
    case POPS_FALLBACK_REWARD_IMPACT.NONE:
    case POPS_FALLBACK_REWARD_IMPACT.FULL_REWARD_ALLOWED:
      return current;
    case POPS_FALLBACK_REWARD_IMPACT.PARTIAL_REWARD_ALLOWED:
      return current === "ELIGIBLE_FULL" ? "ELIGIBLE_PARTIAL" : current;
    case POPS_FALLBACK_REWARD_IMPACT.HOLD_REQUIRED:
      return "HELD_FOR_REVIEW";
    case POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED:
      return "HELD_FOR_REVIEW";
    case POPS_FALLBACK_REWARD_IMPACT.REWARD_DENIED:
      return "DENIED";
    default:
      return current;
  }
}

/** Candidate fallback paths for the current session signal state. */
export function evaluateFallbackOptions(input: PopsFallbackEvaluationInput): PopsFallbackOption[] {
  return collectFallbackOptionsForReason(input);
}

/** Pick a single auditable fallback path (lowest priority wins). */
export function selectFallbackMethod(input: PopsFallbackSelectionInput): PopsFallbackDecision {
  const sorted = [...input.options].sort((a, b) => {
    if (input.preferredMethod) {
      const ap = a.fallbackMethod === input.preferredMethod ? -1 : 0;
      const bp = b.fallbackMethod === input.preferredMethod ? -1 : 0;
      if (ap !== bp) return ap - bp;
    }
    return a.priority - b.priority;
  });

  const defaultOption: PopsFallbackOption = {
    fallbackMethod: POPS_FALLBACK_METHOD.DELAYED_REVIEW,
    priority: 999,
    rewardImpact: POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED,
    requiresUserAction: false,
    requiresAdminReview: true,
    auditReasonCodes: [POPS_FALLBACK_REASON_CODES.PRIVACY_RECEIPT_FALLBACK_APPLIED],
    internalRationale: "No options supplied; default to delayed review."
  };

  const chosen = sorted[0] ?? defaultOption;

  const rewardImpact = chosen.rewardImpact;
  const trustImpact = trustImpactForDecision(rewardImpact, chosen.fallbackMethod);

  /** Optional-signal redistribution: no punitive framing; no tap required. */
  const userVisibleMessage =
    rewardImpact === POPS_FALLBACK_REWARD_IMPACT.NONE &&
    chosen.fallbackMethod === POPS_FALLBACK_METHOD.SIMPLE_ATTENTION_CHECK &&
    !chosen.requiresUserAction
      ? POPS_FALLBACK_USER_COPY.generic
      : userCopyForMethod(chosen.fallbackMethod);

  return {
    id: createFallbackDecisionId(),
    sessionId: input.sessionId,
    userId: input.userId,
    fallbackReason: input.fallbackReason,
    fallbackMethod: chosen.fallbackMethod,
    originalProofLevel: input.originalProofLevel,
    fallbackProofLevel: proofLevelForFallback(input.originalProofLevel, chosen.fallbackMethod),
    rewardImpact,
    trustImpact,
    requiresUserAction: chosen.requiresUserAction,
    requiresAdminReview: chosen.requiresAdminReview,
    userVisibleMessage,
    createdAt: nowIso(),
    auditReasonCodes: chosen.auditReasonCodes
  };
}

/** Merge fallback decision into an in-flight judgment (reason codes + conservative eligibility). */
export function applyFallbackToJudgment(judgment: PopsJudgment, fallbackDecision: PopsFallbackDecision): PopsJudgment {
  const baseCodes = [
    ...judgment.reasonCodes,
    ...fallbackDecision.auditReasonCodes,
    `pops.fallback.applied:${fallbackDecision.fallbackReason}:${fallbackDecision.fallbackMethod}`
  ];

  let presence = judgment.presenceConfidence;
  let attention = judgment.attentionConfidence;
  let continuity = judgment.continuityConfidence;

  if (fallbackDecision.fallbackReason === POPS_FALLBACK_REASON.USER_INTERRUPTED) {
    const isShort = fallbackDecision.auditReasonCodes.includes(
      POPS_FALLBACK_REASON_CODES.INTERRUPTION_SHORT_CONFIDENCE_TRIM
    );
    if (isShort) {
      const trim = 0.06;
      presence = clamp(presence - trim, 0, 1);
      attention = clamp(attention - trim, 0, 1);
      continuity = clamp(continuity - trim, 0, 1);
    }
  }

  if (fallbackDecision.fallbackReason === POPS_FALLBACK_REASON.LOW_BATTERY_MODE) {
    presence = clamp(presence - 0.04, 0, 1);
    attention = clamp(attention - 0.04, 0, 1);
  }

  if (
    fallbackDecision.fallbackReason === POPS_FALLBACK_REASON.VISUAL_SIGNAL_UNAVAILABLE ||
    fallbackDecision.fallbackReason === POPS_FALLBACK_REASON.PERMISSION_DECLINED
  ) {
    if (fallbackDecision.auditReasonCodes.includes(POPS_FALLBACK_REASON_CODES.OPTIONAL_VISUAL_REDISTRIBUTED)) {
      presence = clamp(presence + 0.04, 0, 1);
      attention = clamp(attention + 0.03, 0, 1);
    }
  }

  return {
    ...judgment,
    presenceConfidence: presence,
    attentionConfidence: attention,
    continuityConfidence: continuity,
    rewardEligibility: rewardEligibilityAfterFallback(judgment.rewardEligibility, fallbackDecision.rewardImpact),
    trustImpact: fallbackDecision.trustImpact !== POPS_TRUST_IMPACT.NONE ? fallbackDecision.trustImpact : judgment.trustImpact,
    recommendedAction: recommendedActionForMethod(fallbackDecision.fallbackMethod),
    reasonCodes: baseCodes
  };
}

function cannotBypassFraud(reward: PopsRewardDecision): boolean {
  return (
    reward.decision === POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK ||
    reward.decision === POPS_REWARD_DECISION_STATUS.DENIED_DUPLICATE ||
    reward.fraudRisk >= 0.75
  );
}

function mergeRewardReasonCodes(reward: PopsRewardDecision, fb: PopsFallbackDecision): string[] {
  return [
    ...reward.reasonCodes,
    ...fb.auditReasonCodes,
    `pops.fallback.applied:${fb.fallbackReason}:${fb.fallbackMethod}`
  ];
}

function mapImpactToStatus(
  current: PopsRewardDecisionStatus,
  impact: PopsFallbackDecision["rewardImpact"]
): PopsRewardDecisionStatus {
  switch (impact) {
    case POPS_FALLBACK_REWARD_IMPACT.NONE:
      return current;
    case POPS_FALLBACK_REWARD_IMPACT.FULL_REWARD_ALLOWED:
      return POPS_REWARD_DECISION_STATUS.APPROVED_FULL;
    case POPS_FALLBACK_REWARD_IMPACT.PARTIAL_REWARD_ALLOWED:
      return POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL;
    case POPS_FALLBACK_REWARD_IMPACT.HOLD_REQUIRED:
      return POPS_REWARD_DECISION_STATUS.HELD;
    case POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED:
      return POPS_REWARD_DECISION_STATUS.PENDING_REVIEW;
    case POPS_FALLBACK_REWARD_IMPACT.REWARD_DENIED:
      return POPS_REWARD_DECISION_STATUS.DENIED_INELIGIBLE;
    default:
      return current;
  }
}

function holdReasonFor(
  status: PopsRewardDecisionStatus,
  fraudRisk: number
): typeof POPS_REWARD_HOLD_REASON[keyof typeof POPS_REWARD_HOLD_REASON] | null {
  if (status !== POPS_REWARD_DECISION_STATUS.HELD && status !== POPS_REWARD_DECISION_STATUS.PENDING_REVIEW) {
    return null;
  }
  if (fraudRisk >= 0.5) return POPS_REWARD_HOLD_REASON.FRAUD_RISK_MEDIUM;
  return POPS_REWARD_HOLD_REASON.MANUAL_REVIEW_REQUIRED;
}

/** Apply fallback to wallet reward decision without weakening fraud outcomes. */
export function applyFallbackToRewardDecision(
  rewardDecision: PopsRewardDecision,
  fallbackDecision: PopsFallbackDecision
): PopsRewardDecision {
  const merged = mergeRewardReasonCodes(rewardDecision, fallbackDecision);

  if (rewardDecision.decision === POPS_REWARD_DECISION_STATUS.DENIED_FRAUD_RISK) {
    return { ...rewardDecision, reasonCodes: merged };
  }

  const fraudLocked = cannotBypassFraud(rewardDecision);
  const wantsUpgrade =
    fallbackDecision.rewardImpact === POPS_FALLBACK_REWARD_IMPACT.FULL_REWARD_ALLOWED ||
    fallbackDecision.fallbackMethod === POPS_FALLBACK_METHOD.TRUST_BASED_APPROVAL;

  if (fraudLocked && wantsUpgrade) {
    return {
      ...rewardDecision,
      reasonCodes: merged,
      decision: POPS_REWARD_DECISION_STATUS.PENDING_REVIEW,
      holdRequired: true,
      holdReason: POPS_REWARD_HOLD_REASON.MANUAL_REVIEW_REQUIRED
    };
  }

  const nextStatus = mapImpactToStatus(rewardDecision.decision, fallbackDecision.rewardImpact);

  let finalAmount = rewardDecision.finalAmount;
  if (nextStatus === POPS_REWARD_DECISION_STATUS.APPROVED_PARTIAL || fallbackDecision.rewardImpact === POPS_FALLBACK_REWARD_IMPACT.PARTIAL_REWARD_ALLOWED) {
    finalAmount = Math.max(0, Math.floor(rewardDecision.finalAmount * 0.75));
  }

  const holdRequired =
    nextStatus === POPS_REWARD_DECISION_STATUS.HELD || nextStatus === POPS_REWARD_DECISION_STATUS.PENDING_REVIEW;

  return {
    ...rewardDecision,
    decision: nextStatus,
    finalAmount,
    holdRequired: holdRequired || rewardDecision.holdRequired,
    holdReason: holdRequired ? holdReasonFor(nextStatus, rewardDecision.fraudRisk) : rewardDecision.holdReason,
    reasonCodes: merged
  };
}

/** Stored privacy receipt feature flags to append when a fallback path runs (scoring unavailable, review, etc.). */
export function fallbackPrivacyReceiptStoredFeatures(fallbackDecision: PopsFallbackDecision): PopsStoredFeatureType[] {
  const out: PopsStoredFeatureType[] = [
    POPS_STORED_FEATURE_TYPE.REASON_CODES,
    POPS_STORED_FEATURE_TYPE.REWARD_DECISION,
    POPS_STORED_FEATURE_TYPE.PRIVACY_POLICY_VERSION
  ];

  if (fallbackDecision.rewardImpact === POPS_FALLBACK_REWARD_IMPACT.REVIEW_REQUIRED) {
    out.push(POPS_STORED_FEATURE_TYPE.FRAUD_RISK);
  }

  if (fallbackDecision.fallbackReason === POPS_FALLBACK_REASON.SCORING_UNAVAILABLE) {
    out.push(POPS_STORED_FEATURE_TYPE.SESSION_STATE);
  }

  return out;
}

/** Convenience: evaluate + select in one step. */
export function evaluateAndSelectFallback(input: PopsFallbackEvaluationInput, preferredMethod?: PopsFallbackDecision["fallbackMethod"]): PopsFallbackDecision {
  const options = evaluateFallbackOptions(input);
  return selectFallbackMethod({ ...input, options, preferredMethod });
}
