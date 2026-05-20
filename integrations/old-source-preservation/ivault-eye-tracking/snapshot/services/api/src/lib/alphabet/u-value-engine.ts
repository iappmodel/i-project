import { U_VALUE_RULES } from "../../data/alphabet/u-value-rules";
import type {
  UValueAuditItem,
  UValueImpactEvent,
  UValueRule,
  UValueState,
  UValueTier,
  UValueUpdateResult
} from "../../types/alphabet/u-value.types";

export function createDefaultUValueState(userId: string): UValueState {
  return {
    userId,
    uValueScore: 0,
    uValueTier: 0,
    lifetimePositiveValue: 0,
    lifetimeNegativeEvents: 0,
    contributionScore: 0,
    learningScore: 0,
    creationScore: 0,
    helpScore: 0,
    trustScore: 0,
    safetyScore: 0,
    masteryScore: 0,
    communityScore: 0,
    economicScore: 0,
    originalityScore: 0,
    yieldScore: 0,
    grantEligibility: false,
    scholarshipEligibility: false,
    rareRewardEligibility: false,
    protectionEligibility: false,
    boostEligibility: false,
    platformCitizenStatus: false,
    severeNegativeCount: 0,
    catastrophicNegativeCount: 0,
    lastUpdatedAt: new Date().toISOString()
  };
}

export function calculateUValueTier(score: number): UValueTier {
  if (score >= 10000) return 7;
  if (score >= 5000) return 6;
  if (score >= 2000) return 5;
  if (score >= 750) return 4;
  if (score >= 250) return 3;
  if (score >= 75) return 2;
  if (score >= 15) return 1;
  return 0;
}

function clamp(value: number, min = 0, max = 100000): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(event: UValueImpactEvent): UValueRule | undefined {
  return U_VALUE_RULES.find((rule) => {
    return rule.active && rule.eventType === event.eventType;
  });
}

function confidenceAdjust(delta: number, confidence: number): number {
  const safeConfidence = Math.min(1, Math.max(0, confidence));

  if (delta > 0) {
    return delta * safeConfidence * 0.8;
  }

  if (delta < 0) {
    return delta * Math.max(0.55, safeConfidence);
  }

  return 0;
}

function createAuditItem(params: {
  field: UValueAuditItem["field"];
  before: number;
  delta: number;
  after: number;
  reason: string;
}): UValueAuditItem {
  return {
    field: params.field,
    before: Number(params.before.toFixed(4)),
    delta: Number(params.delta.toFixed(4)),
    after: Number(params.after.toFixed(4)),
    reason: params.reason
  };
}

function applyDelta(params: {
  state: UValueState;
  auditTrail: UValueAuditItem[];
  field: UValueAuditItem["field"];
  rawDelta: number;
  confidence: number;
  reason: string;
}): UValueState {
  const before = Number(params.state[params.field]);
  const delta = confidenceAdjust(params.rawDelta, params.confidence);
  const after = clamp(before + delta);

  params.auditTrail.push(
    createAuditItem({
      field: params.field,
      before,
      delta,
      after,
      reason: params.reason
    })
  );

  return {
    ...params.state,
    [params.field]: after
  };
}

function isNegativeSeverity(severity: UValueImpactEvent["severity"]): boolean {
  return severity.startsWith("negative") || severity === "catastrophic";
}

function updateNegativeCounts(
  state: UValueState,
  event: UValueImpactEvent
): UValueState {
  let next = { ...state };

  if (isNegativeSeverity(event.severity)) {
    next.lifetimeNegativeEvents += 1;
  }

  if (event.severity === "negative_severe") {
    next.severeNegativeCount += 1;
  }

  if (event.severity === "catastrophic") {
    next.catastrophicNegativeCount += 1;
    next.severeNegativeCount += 1;
  }

  return next;
}

function updateLifetimePositiveValue(
  state: UValueState,
  previousScore: number
): UValueState {
  const gain = Math.max(0, state.uValueScore - previousScore);

  return {
    ...state,
    lifetimePositiveValue: Number((state.lifetimePositiveValue + gain).toFixed(4))
  };
}

function computeEligibility(state: UValueState, rule: UValueRule): UValueState {
  const severePenalty = state.severeNegativeCount > 0;
  const catastrophicPenalty = state.catastrophicNegativeCount > 0;

  const grantEligibility =
    !severePenalty &&
    (state.grantEligibility ||
      (rule.canTriggerGrantEligibility && state.uValueScore >= 250));

  const scholarshipEligibility =
    !severePenalty &&
    (state.scholarshipEligibility ||
      (rule.canTriggerScholarshipEligibility &&
        state.learningScore >= 100 &&
        state.uValueScore >= 250));

  const rareRewardEligibility =
    !severePenalty &&
    (state.rareRewardEligibility ||
      (rule.canTriggerRareRewardEligibility && state.uValueScore >= 750));

  const protectionEligibility =
    !catastrophicPenalty &&
    (state.protectionEligibility ||
      (rule.canTriggerProtectionEligibility &&
        state.safetyScore + state.helpScore + state.communityScore >= 150));

  const boostEligibility =
    !severePenalty &&
    (state.boostEligibility ||
      (rule.canTriggerBoostEligibility && state.uValueScore >= 75));

  const platformCitizenStatus =
    !severePenalty &&
    (state.platformCitizenStatus ||
      (rule.canTriggerPlatformCitizenStatus &&
        state.uValueScore >= 2000 &&
        state.safetyScore >= 100 &&
        state.trustScore >= 100));

  return {
    ...state,
    grantEligibility,
    scholarshipEligibility,
    rareRewardEligibility,
    protectionEligibility,
    boostEligibility,
    platformCitizenStatus
  };
}

function getEligibilityChanges(
  previous: UValueState,
  next: UValueState
): UValueUpdateResult["eligibilityChanges"] {
  return {
    grantEligibilityChanged: previous.grantEligibility !== next.grantEligibility,
    scholarshipEligibilityChanged:
      previous.scholarshipEligibility !== next.scholarshipEligibility,
    rareRewardEligibilityChanged:
      previous.rareRewardEligibility !== next.rareRewardEligibility,
    protectionEligibilityChanged:
      previous.protectionEligibility !== next.protectionEligibility,
    boostEligibilityChanged: previous.boostEligibility !== next.boostEligibility,
    platformCitizenStatusChanged:
      previous.platformCitizenStatus !== next.platformCitizenStatus
  };
}

export function applyUValueImpactEvent(params: {
  previousState: UValueState;
  event: UValueImpactEvent;
}): UValueUpdateResult {
  const { previousState, event } = params;

  if (previousState.userId !== event.userId) {
    return {
      updated: false,
      reason: "U Value event userId does not match UValueState userId.",
      previousState,
      nextState: previousState,
      event,
      auditTrail: [],
      eligibilityChanges: {
        grantEligibilityChanged: false,
        scholarshipEligibilityChanged: false,
        rareRewardEligibilityChanged: false,
        protectionEligibilityChanged: false,
        boostEligibilityChanged: false,
        platformCitizenStatusChanged: false
      }
    };
  }

  const rule = findRule(event);

  if (!rule) {
    return {
      updated: false,
      reason: "No active U Value rule for event.",
      previousState,
      nextState: previousState,
      event,
      auditTrail: [],
      eligibilityChanges: {
        grantEligibilityChanged: false,
        scholarshipEligibilityChanged: false,
        rareRewardEligibilityChanged: false,
        protectionEligibilityChanged: false,
        boostEligibilityChanged: false,
        platformCitizenStatusChanged: false
      }
    };
  }

  const auditTrail: UValueAuditItem[] = [];
  const reason = `${event.eventType}:${event.category}:${event.severity}`;

  let nextState = { ...previousState };
  const previousScore = previousState.uValueScore;

  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "uValueScore",
    rawDelta: rule.uValueDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "contributionScore",
    rawDelta: rule.contributionDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "learningScore",
    rawDelta: rule.learningDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "creationScore",
    rawDelta: rule.creationDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "helpScore",
    rawDelta: rule.helpDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "trustScore",
    rawDelta: rule.trustDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "safetyScore",
    rawDelta: rule.safetyDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "masteryScore",
    rawDelta: rule.masteryDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "communityScore",
    rawDelta: rule.communityDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "economicScore",
    rawDelta: rule.economicDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "originalityScore",
    rawDelta: rule.originalityDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    state: nextState,
    auditTrail,
    field: "yieldScore",
    rawDelta: rule.yieldDelta,
    confidence: event.confidence,
    reason
  });

  nextState = updateNegativeCounts(nextState, event);
  nextState = updateLifetimePositiveValue(nextState, previousScore);

  nextState = {
    ...nextState,
    uValueTier: calculateUValueTier(nextState.uValueScore),
    lastUpdatedAt: new Date().toISOString()
  };

  const beforeEligibility = nextState;
  nextState = computeEligibility(nextState, rule);

  return {
    updated: true,
    previousState,
    nextState,
    event,
    rule,
    auditTrail,
    eligibilityChanges: getEligibilityChanges(beforeEligibility, nextState)
  };
}

export function applyUValueImpactEvents(params: {
  previousState: UValueState;
  events: UValueImpactEvent[];
}): UValueUpdateResult[] {
  const results: UValueUpdateResult[] = [];
  let state = params.previousState;

  for (const event of params.events) {
    const result = applyUValueImpactEvent({
      previousState: state,
      event
    });

    results.push(result);

    if (result.updated) {
      state = result.nextState;
    }
  }

  return results;
}
