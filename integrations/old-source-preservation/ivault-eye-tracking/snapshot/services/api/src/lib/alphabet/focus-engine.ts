import { FOCUS_RULES } from "../../data/alphabet/focus-rules";
import type {
  FocusRuleSet,
  FocusSignalInput,
  FocusVerificationResult,
  FocusVerificationStatus
} from "../../types/alphabet/focus.types";
import type { AlphabetEvent } from "../../types/alphabet/event.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: FocusSignalInput): FocusRuleSet | undefined {
  return FOCUS_RULES.find((rule) => rule.active && rule.purpose === input.purpose);
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateFocusedRatio(input: FocusSignalInput): number {
  if (input.intendedDurationMs <= 0) return 0;
  return clamp(input.focusedDurationMs / input.intendedDurationMs);
}

function calculateIdleRatio(input: FocusSignalInput): number {
  if (input.intendedDurationMs <= 0) return 1;
  return clamp(input.idleTimeMs / input.intendedDurationMs);
}

function calculateFocusDepthScore(input: FocusSignalInput): number {
  const focusedRatio = calculateFocusedRatio(input);

  const score =
    focusedRatio * 0.35 +
    clamp(input.taskContinuityScore) * 0.25 +
    clamp(input.attentionStabilityScore) * 0.25 +
    clamp(input.sessionContinuityScore) * 0.15;

  return clamp(score);
}

function calculateDistractionScore(input: FocusSignalInput): number {
  const idleRatio = calculateIdleRatio(input);
  const interruptionPressure = clamp(input.interruptionCount / 10);
  const appSwitchPressure = clamp(input.appSwitchCount / 10);

  const score =
    interruptionPressure * 0.25 +
    appSwitchPressure * 0.25 +
    idleRatio * 0.25 +
    clamp(input.scrollNoiseScore) * 0.25;

  return clamp(score);
}

function calculateFocusQualityScore(input: FocusSignalInput): number {
  const distractionScore = calculateDistractionScore(input);

  const score =
    clamp(input.taskContinuityScore) * 0.3 +
    clamp(input.interactionCoherenceScore) * 0.25 +
    clamp(input.attentionStabilityScore) * 0.25 +
    clamp(input.deviceIntegrityScore) * 0.1 +
    clamp(input.sessionContinuityScore) * 0.1;

  return clamp(score * (1 - distractionScore * 0.65));
}

function calculateRiskScore(input: FocusSignalInput): number {
  const risk =
    clamp(input.botSignalScore) * 0.35 +
    clamp(input.automationRisk) * 0.3 +
    clamp(input.duplicateSessionRisk) * 0.2 +
    (input.deviceIntegrityScore < 0.45 ? 0.1 : 0) +
    (input.sessionContinuityScore < 0.45 ? 0.05 : 0);

  return clamp(risk);
}

function calculateFocusMultiplier(params: {
  focusDepthScore: number;
  focusQualityScore: number;
  distractionScore: number;
  riskScore: number;
  status: FocusVerificationStatus;
}): number {
  if (params.status !== "verified" && params.status !== "weak") return 0;

  const base =
    params.focusDepthScore * 0.45 +
    params.focusQualityScore * 0.45 +
    (1 - params.distractionScore) * 0.1;

  const riskPenalty = 1 - params.riskScore * 0.75;
  const multiplier = base * riskPenalty;

  if (params.status === "weak") {
    return Number(Math.max(0.25, multiplier * 0.6).toFixed(4));
  }

  if (multiplier >= 0.9) return 1.5;
  if (multiplier >= 0.8) return 1.25;
  if (multiplier >= 0.65) return 1;
  if (multiplier >= 0.5) return 0.75;

  return 0.5;
}

function decideFocusStatus(params: {
  input: FocusSignalInput;
  rule: FocusRuleSet;
  focusedRatio: number;
  focusDepthScore: number;
  focusQualityScore: number;
  distractionScore: number;
  riskScore: number;
  reasons: string[];
}): FocusVerificationStatus {
  const { input, rule, focusedRatio, focusQualityScore, distractionScore, riskScore, reasons } = params;

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_not_allowed_for_focus_purpose");
    return "suspicious";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_not_allowed_for_focus_purpose");
    return "suspicious";
  }

  if (input.focusedDurationMs < rule.minFocusedDurationMs) {
    reasons.push("focused_duration_below_minimum");
    return focusedRatio < 0.5 ? "incomplete" : "weak";
  }

  if (focusedRatio < rule.minFocusedRatio) {
    reasons.push("focused_ratio_below_minimum");
    return focusedRatio < 0.5 ? "incomplete" : "weak";
  }

  if (input.interruptionCount > rule.maxInterruptionCount) {
    reasons.push("interruption_count_above_maximum");
    return "distracted";
  }

  if (input.appSwitchCount > rule.maxAppSwitchCount) {
    reasons.push("app_switch_count_above_maximum");
    return "distracted";
  }

  if (calculateIdleRatio(input) > rule.maxIdleRatio) {
    reasons.push("idle_ratio_above_maximum");
    return "distracted";
  }

  if (input.taskContinuityScore < rule.minTaskContinuityScore) {
    reasons.push("task_continuity_below_minimum");
    return "weak";
  }

  if (input.interactionCoherenceScore < rule.minInteractionCoherenceScore) {
    reasons.push("interaction_coherence_below_minimum");
    return "weak";
  }

  if (input.attentionStabilityScore < rule.minAttentionStabilityScore) {
    reasons.push("attention_stability_below_minimum");
    return "weak";
  }

  if (input.deviceIntegrityScore < rule.minDeviceIntegrityScore) {
    reasons.push("device_integrity_below_minimum");
    return "suspicious";
  }

  if (distractionScore > rule.maxDistractionScore) {
    reasons.push("distraction_score_above_maximum");
    return "distracted";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.8 ? "suspicious" : "weak";
  }

  if (focusQualityScore < 0.45) {
    reasons.push("focus_quality_too_low");
    return "weak";
  }

  reasons.push("focus_verified");
  return "verified";
}

function eventSourceContextFromPurpose(
  purpose: FocusSignalInput["purpose"]
): AlphabetEvent["sourceContext"] {
  switch (purpose) {
    case "campaign":
      return "campaign";
    case "learning":
      return "learning";
    case "work":
      return "marketplace";
    case "creation":
    case "mastery":
      return "creator";
    case "general":
      return "system";
    default:
      return "system";
  }
}

function createFocusAlphabetEvent(params: {
  input: FocusSignalInput;
  status: FocusVerificationStatus;
  focusDepthScore: number;
  focusQualityScore: number;
  distractionScore: number;
  riskScore: number;
  focusedRatio: number;
  focusMultiplier: number;
  reasons: string[];
}): AlphabetEvent {
  const eventType =
    params.status === "verified" || params.status === "weak"
      ? "focus_session_verified"
      : params.status === "incomplete"
        ? "focus_session_completed"
        : "focus_session_rejected";

  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "F",
    eventType,
    objectType: "focus_session",
    objectId: params.input.focusSessionId,
    sourceContext: eventSourceContextFromPurpose(params.input.purpose),
    rawScore: params.focusDepthScore,
    qualityScore: params.focusQualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus:
      params.status === "verified" || params.status === "weak" ? "verified" : "rejected",
    metadata: {
      focusSessionId: params.input.focusSessionId,
      purpose: params.input.purpose,
      focusedDurationMs: params.input.focusedDurationMs,
      intendedDurationMs: params.input.intendedDurationMs,
      focusedRatio: params.focusedRatio,
      distractionScore: params.distractionScore,
      focusMultiplier: params.focusMultiplier,
      reasons: params.reasons,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

function createFCoinScoreEvent(params: {
  input: FocusSignalInput;
  focusDepthScore: number;
  focusQualityScore: number;
  riskScore: number;
  focusMultiplier: number;
  reasons: string[];
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "F",
    eventType: "focus_session_verified",
    objectType: "fcoin_score_update",
    objectId: params.input.focusSessionId,
    sourceContext: eventSourceContextFromPurpose(params.input.purpose),
    rawScore: params.focusDepthScore,
    qualityScore: params.focusQualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: "verified",
    metadata: {
      issueMode: "score_update",
      focusSessionId: params.input.focusSessionId,
      focusMultiplier: params.focusMultiplier,
      reasons: params.reasons,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyFocusSession(input: FocusSignalInput): FocusVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);
  const focusedRatio = calculateFocusedRatio(input);
  const focusDepthScore = calculateFocusDepthScore(input);
  const focusQualityScore = calculateFocusQualityScore(input);
  const distractionScore = calculateDistractionScore(input);
  const riskScore = calculateRiskScore(input);

  if (!rule) {
    reasons.push("no_active_focus_rule");
    const status: FocusVerificationStatus = "suspicious";
    const focusMultiplier = 0;
    const event = createFocusAlphabetEvent({
      input,
      status,
      focusDepthScore,
      focusQualityScore,
      distractionScore,
      riskScore,
      focusedRatio,
      focusMultiplier,
      reasons
    });

    return {
      focusSessionId: input.focusSessionId,
      userId: input.userId,
      status,
      focusDepthScore,
      focusQualityScore,
      distractionScore,
      riskScore,
      focusedRatio,
      focusMultiplier,
      reasons,
      event,
      fCoinEvent: null,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideFocusStatus({
    input,
    rule,
    focusedRatio,
    focusDepthScore,
    focusQualityScore,
    distractionScore,
    riskScore,
    reasons
  });

  const focusMultiplier = calculateFocusMultiplier({
    focusDepthScore,
    focusQualityScore,
    distractionScore,
    riskScore,
    status
  });

  const event = createFocusAlphabetEvent({
    input,
    status,
    focusDepthScore,
    focusQualityScore,
    distractionScore,
    riskScore,
    focusedRatio,
    focusMultiplier,
    reasons
  });

  const fCoinEvent =
    status === "verified"
      ? createFCoinScoreEvent({
          input,
          focusDepthScore,
          focusQualityScore,
          riskScore,
          focusMultiplier,
          reasons
        })
      : null;

  return {
    focusSessionId: input.focusSessionId,
    userId: input.userId,
    status,
    focusDepthScore,
    focusQualityScore,
    distractionScore,
    riskScore,
    focusedRatio,
    focusMultiplier,
    reasons,
    event,
    fCoinEvent,
    metadata: {
      rulePurpose: rule.purpose,
      ...input.metadata
    }
  };
}
