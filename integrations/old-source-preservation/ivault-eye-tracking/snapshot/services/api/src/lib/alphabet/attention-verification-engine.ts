import { ATTENTION_RULES } from "../../data/alphabet/attention-rules";
import type {
  AttentionRuleSet,
  AttentionSignalInput,
  AttentionVerificationResult,
  AttentionVerificationStatus
} from "../../types/alphabet/attention.types";
import type { AlphabetEvent } from "../../types/alphabet/event.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: AttentionSignalInput): AttentionRuleSet | undefined {
  return ATTENTION_RULES.find((rule) => {
    return rule.active && rule.context === input.context;
  });
}

function isUnder13(ageBand: string): boolean {
  return ageBand === "under_13";
}

function isTeen(ageBand: string): boolean {
  return ageBand === "13_15" || ageBand === "16_17";
}

function calculateWatchedRatio(input: AttentionSignalInput): number {
  if (input.requiredDurationMs <= 0) return 0;

  return clamp(input.watchedDurationMs / input.requiredDurationMs);
}

function calculateRawAttentionScore(input: AttentionSignalInput): number {
  const watchedRatio = calculateWatchedRatio(input);

  const score =
    watchedRatio * 0.45 +
    clamp(input.visibilityPercent) * 0.25 +
    clamp(input.foregroundPercent) * 0.2 +
    clamp(input.sessionContinuityScore) * 0.1;

  return clamp(score);
}

function calculateQualityScore(input: AttentionSignalInput): number {
  const mutedPenalty = input.muted ? 0.92 : 1;
  const skippedPenalty = input.skipped ? 0.65 : 1;
  const hiddenPenalty = input.tabHidden || input.screenOffDetected ? 0.4 : 1;

  const score =
    clamp(input.focusStabilityScore) * 0.35 +
    clamp(input.scrollStabilityScore) * 0.2 +
    clamp(input.interactionIntegrityScore) * 0.2 +
    clamp(input.deviceIntegrityScore) * 0.15 +
    clamp(input.networkIntegrityScore) * 0.1;

  return clamp(score * mutedPenalty * skippedPenalty * hiddenPenalty);
}

function calculateRiskScore(input: AttentionSignalInput): number {
  let risk =
    clamp(input.botSignalScore) * 0.3 +
    clamp(input.duplicateSessionRisk) * 0.2 +
    clamp(input.velocityRisk) * 0.2 +
    clamp(input.emulatorRisk) * 0.15 +
    (input.replayLoopDetected ? 0.1 : 0) +
    (input.tabHidden ? 0.025 : 0) +
    (input.screenOffDetected ? 0.025 : 0);

  if (input.deviceIntegrityScore < 0.4) {
    risk += 0.1;
  }

  if (input.sessionContinuityScore < 0.4) {
    risk += 0.1;
  }

  return clamp(risk);
}

function decideVerificationStatus(params: {
  input: AttentionSignalInput;
  rule: AttentionRuleSet;
  watchedRatio: number;
  rawAttentionScore: number;
  qualityScore: number;
  riskScore: number;
  reasons: string[];
}): AttentionVerificationStatus {
  const { input, rule, watchedRatio, qualityScore, riskScore, reasons } = params;

  if (isUnder13(input.ageBand) && !rule.under13Allowed) {
    reasons.push("under_13_not_allowed_for_context");
    return "rejected";
  }

  if (isTeen(input.ageBand) && !rule.teenAllowed) {
    reasons.push("teen_not_allowed_for_context");
    return "rejected";
  }

  if (watchedRatio < rule.minWatchedRatio) {
    reasons.push("watched_ratio_below_minimum");
    return watchedRatio < 0.5 ? "incomplete" : "rejected";
  }

  if (input.visibilityPercent < rule.minVisibilityPercent) {
    reasons.push("visibility_below_minimum");
    return "rejected";
  }

  if (input.foregroundPercent < rule.minForegroundPercent) {
    reasons.push("foreground_below_minimum");
    return "rejected";
  }

  if (input.focusStabilityScore < rule.minFocusStabilityScore) {
    reasons.push("focus_stability_below_minimum");
    return "suspicious";
  }

  if (input.deviceIntegrityScore < rule.minDeviceIntegrityScore) {
    reasons.push("device_integrity_below_minimum");
    return "suspicious";
  }

  if (!rule.allowMuted && input.muted) {
    reasons.push("muted_not_allowed");
    return "rejected";
  }

  if (!rule.allowSkipped && input.skipped) {
    reasons.push("skipped_not_allowed");
    return "rejected";
  }

  if (!rule.allowReplayLoop && input.replayLoopDetected) {
    reasons.push("replay_loop_detected");
    return "rejected";
  }

  if (riskScore > rule.maxRiskScore) {
    reasons.push("risk_score_above_maximum");
    return riskScore > 0.8 ? "rejected" : "suspicious";
  }

  if (qualityScore < 0.4) {
    reasons.push("quality_score_too_low");
    return "suspicious";
  }

  reasons.push("attention_verified");

  return "verified";
}

function createAlphabetEventFromAttention(params: {
  input: AttentionSignalInput;
  status: AttentionVerificationStatus;
  rawAttentionScore: number;
  qualityScore: number;
  riskScore: number;
  watchedRatio: number;
  reasons: string[];
}): AlphabetEvent {
  const eventType =
    params.status === "verified"
      ? "attention_verified"
      : params.status === "incomplete"
        ? "attention_session_completed"
        : "attention_rejected";

  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "A",
    eventType,
    objectType: params.input.context,
    objectId: params.input.attentionSessionId,
    sourceContext:
      params.input.context === "campaign"
        ? "campaign"
        : params.input.context === "learning"
          ? "learning"
          : params.input.context === "igo"
            ? "igo"
            : params.input.context === "creator_content"
              ? "creator"
              : "feed",
    rawScore: params.rawAttentionScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: null,
    riskScore: params.riskScore,
    ageBand: params.input.ageBand,
    verificationStatus: params.status === "verified" ? "verified" : "rejected",
    metadata: {
      attentionSessionId: params.input.attentionSessionId,
      context: params.input.context,
      watchedDurationMs: params.input.watchedDurationMs,
      requiredDurationMs: params.input.requiredDurationMs,
      watchedRatio: params.watchedRatio,
      reasons: params.reasons,
      campaignId: params.input.metadata?.campaignId,
      creatorId: params.input.metadata?.creatorId,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function verifyAttentionSession(
  input: AttentionSignalInput
): AttentionVerificationResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  if (!rule) {
    const rawAttentionScore = calculateRawAttentionScore(input);
    const qualityScore = calculateQualityScore(input);
    const riskScore = calculateRiskScore(input);
    const watchedRatio = calculateWatchedRatio(input);

    reasons.push("no_active_attention_rule");

    const event = createAlphabetEventFromAttention({
      input,
      status: "rejected",
      rawAttentionScore,
      qualityScore,
      riskScore,
      watchedRatio,
      reasons
    });

    return {
      attentionSessionId: input.attentionSessionId,
      userId: input.userId,
      status: "rejected",
      rawAttentionScore,
      qualityScore,
      riskScore,
      watchedRatio,
      reasons,
      event,
      metadata: input.metadata ?? {}
    };
  }

  const watchedRatio = calculateWatchedRatio(input);
  const rawAttentionScore = calculateRawAttentionScore(input);
  const qualityScore = calculateQualityScore(input);
  const riskScore = calculateRiskScore(input);

  const status = decideVerificationStatus({
    input,
    rule,
    watchedRatio,
    rawAttentionScore,
    qualityScore,
    riskScore,
    reasons
  });

  const event = createAlphabetEventFromAttention({
    input,
    status,
    rawAttentionScore,
    qualityScore,
    riskScore,
    watchedRatio,
    reasons
  });

  return {
    attentionSessionId: input.attentionSessionId,
    userId: input.userId,
    status,
    rawAttentionScore,
    qualityScore,
    riskScore,
    watchedRatio,
    reasons,
    event,
    metadata: {
      ruleContext: rule.context,
      ...input.metadata
    }
  };
}
