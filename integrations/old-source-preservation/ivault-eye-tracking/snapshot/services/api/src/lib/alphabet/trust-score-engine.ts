import { TRUST_RULES } from "../../data/alphabet/trust-rules";
import type {
  TrustImpactEvent,
  TrustRule,
  TrustScoreState,
  TrustScoreUpdateAuditItem,
  TrustScoreUpdateResult,
  TrustTier
} from "../../types/alphabet/trust.types";

export function createDefaultTrustScoreState(userId: string): TrustScoreState {
  const now = new Date().toISOString();

  return {
    userId,
    trustScore: 25,
    trustTier: 1,
    identityScore: 0,
    paymentRiskScore: 50,
    safetyScore: 50,
    reputationScore: 0,
    judgmentScore: 0,
    qualityScore: 0,
    severeViolationCount: 0,
    catastrophicViolationCount: 0,
    lastUpdatedAt: now,
    lastReviewAt: null
  };
}

export function calculateTrustTier(trustScore: number): TrustTier {
  if (trustScore >= 90) return 5;
  if (trustScore >= 75) return 4;
  if (trustScore >= 55) return 3;
  if (trustScore >= 35) return 2;
  if (trustScore >= 15) return 1;
  return 0;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function clampPaymentRisk(value: number): number {
  return clamp(value, 0, 100);
}

function findTrustRule(event: TrustImpactEvent): TrustRule | undefined {
  return TRUST_RULES.find((rule) => {
    return rule.active && rule.eventType === event.eventType;
  });
}

function confidenceAdjust(delta: number, confidence: number): number {
  const safeConfidence = clamp(confidence, 0, 1);

  if (delta > 0) {
    return delta * safeConfidence * 0.75;
  }

  if (delta < 0) {
    return delta * Math.max(0.5, safeConfidence);
  }

  return 0;
}

function createAuditItem(params: {
  field: TrustScoreUpdateAuditItem["field"];
  before: number;
  delta: number;
  after: number;
  reason: string;
}): TrustScoreUpdateAuditItem {
  return {
    field: params.field,
    before: Number(params.before.toFixed(4)),
    delta: Number(params.delta.toFixed(4)),
    after: Number(params.after.toFixed(4)),
    reason: params.reason
  };
}

function applyDelta(params: {
  auditTrail: TrustScoreUpdateAuditItem[];
  state: TrustScoreState;
  field: TrustScoreUpdateAuditItem["field"];
  rawDelta: number;
  confidence: number;
  reason: string;
  clampMin?: number;
  clampMax?: number;
}): TrustScoreState {
  const before = Number(params.state[params.field]);
  const adjustedDelta = confidenceAdjust(params.rawDelta, params.confidence);

  const after =
    params.field === "paymentRiskScore"
      ? clampPaymentRisk(before + adjustedDelta)
      : clamp(before + adjustedDelta, params.clampMin ?? 0, params.clampMax ?? 100);

  params.auditTrail.push(
    createAuditItem({
      field: params.field,
      before,
      delta: adjustedDelta,
      after,
      reason: params.reason
    })
  );

  return {
    ...params.state,
    [params.field]: after
  };
}

function incrementViolationCounts(
  state: TrustScoreState,
  event: TrustImpactEvent
): TrustScoreState {
  if (event.severity === "catastrophic") {
    return {
      ...state,
      catastrophicViolationCount: state.catastrophicViolationCount + 1,
      severeViolationCount: state.severeViolationCount + 1
    };
  }

  if (event.severity === "negative_severe") {
    return {
      ...state,
      severeViolationCount: state.severeViolationCount + 1
    };
  }

  return state;
}

export function applyTrustImpactEvent(params: {
  previousState: TrustScoreState;
  event: TrustImpactEvent;
}): TrustScoreUpdateResult {
  const { previousState, event } = params;

  if (previousState.userId !== event.userId) {
    return {
      updated: false,
      reason: "Trust event userId does not match TrustScoreState userId.",
      previousState,
      nextState: previousState,
      event,
      auditTrail: [],
      flags: {
        requiresManualReview: false,
        freezesWithdrawals: false,
        freezesConversions: false,
        freezesCreatorMonetization: false
      }
    };
  }

  const rule = findTrustRule(event);

  if (!rule) {
    return {
      updated: false,
      reason: "No active trust rule for event.",
      previousState,
      nextState: previousState,
      event,
      auditTrail: [],
      flags: {
        requiresManualReview: false,
        freezesWithdrawals: false,
        freezesConversions: false,
        freezesCreatorMonetization: false
      }
    };
  }

  const auditTrail: TrustScoreUpdateAuditItem[] = [];
  let nextState = { ...previousState };

  const reason = `${event.eventType}:${event.category}:${event.severity}`;

  nextState = applyDelta({
    auditTrail,
    state: nextState,
    field: "trustScore",
    rawDelta: rule.trustDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    auditTrail,
    state: nextState,
    field: "identityScore",
    rawDelta: rule.identityDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    auditTrail,
    state: nextState,
    field: "paymentRiskScore",
    rawDelta: rule.paymentRiskDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    auditTrail,
    state: nextState,
    field: "safetyScore",
    rawDelta: rule.safetyDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    auditTrail,
    state: nextState,
    field: "reputationScore",
    rawDelta: rule.reputationDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    auditTrail,
    state: nextState,
    field: "judgmentScore",
    rawDelta: rule.judgmentDelta,
    confidence: event.confidence,
    reason
  });
  nextState = applyDelta({
    auditTrail,
    state: nextState,
    field: "qualityScore",
    rawDelta: rule.qualityDelta,
    confidence: event.confidence,
    reason
  });

  nextState = incrementViolationCounts(nextState, event);

  const trustTier = calculateTrustTier(nextState.trustScore);
  const now = new Date().toISOString();

  nextState = {
    ...nextState,
    trustTier,
    lastUpdatedAt: now,
    lastReviewAt: rule.requiresManualReview ? now : nextState.lastReviewAt
  };

  return {
    updated: true,
    previousState,
    nextState,
    event,
    rule,
    auditTrail,
    flags: {
      requiresManualReview: rule.requiresManualReview,
      freezesWithdrawals: rule.freezesWithdrawals,
      freezesConversions: rule.freezesConversions,
      freezesCreatorMonetization: rule.freezesCreatorMonetization
    }
  };
}

export function applyTrustImpactEvents(params: {
  previousState: TrustScoreState;
  events: TrustImpactEvent[];
}): TrustScoreUpdateResult[] {
  const results: TrustScoreUpdateResult[] = [];
  let state = params.previousState;

  for (const event of params.events) {
    const result = applyTrustImpactEvent({
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
