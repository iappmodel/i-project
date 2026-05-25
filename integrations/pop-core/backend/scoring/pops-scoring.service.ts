import { POPS_DEFAULT_SCORING_WEIGHTS } from "./pops.constants.js";
import type { PopsScoringResult } from "../types/pops-decisions.types.js";
import type { PopsSignalBatch } from "../types/pops.types.js";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(4))));
}

function weightedAverage(items: Array<{ value: number; weight: number }>): number {
  const weightSum = items.reduce((sum, item) => sum + item.weight, 0);
  if (weightSum <= 0) return 0;
  const weightedSum = items.reduce((sum, item) => sum + item.value * item.weight, 0);
  return clamp01(weightedSum / weightSum);
}

function boolToScore(value: boolean): number {
  return value ? 1 : 0;
}

function contentDwellScore(batch: PopsSignalBatch): number {
  const normalizedPosition = clamp01(batch.signals.contentPositionMs / Math.max(batch.signals.contentPositionMs, 15000));
  const normalizedProgress = clamp01(batch.signals.contentProgressPct);
  return clamp01(normalizedPosition * 0.55 + normalizedProgress * 0.45);
}

function ctaTimingScore(batch: PopsSignalBatch): number {
  if (batch.signals.contentProgressPct <= 0) return 0;
  return clamp01(batch.signals.touchIntentScore * batch.signals.contentProgressPct);
}

function deliberateActionScore(batch: PopsSignalBatch): number {
  const lowNoiseTouch = 1 - clamp01(batch.signals.audioDistractionScore);
  return clamp01(batch.signals.touchIntentScore * 0.7 + lowNoiseTouch * 0.3);
}

function sessionConsistencyScore(batch: PopsSignalBatch): number {
  const stableForeground = batch.signals.appForegrounded && batch.signals.screenActive ? 1 : 0.2;
  return clamp01(
    stableForeground * 0.35 +
      batch.signals.motionStabilityScore * 0.25 +
      batch.signals.accountContinuityScore * 0.2 +
      batch.signals.deviceIntegrityScore * 0.2
  );
}

function automationSignalScore(batch: PopsSignalBatch): number {
  const impossibleHighTouchLowProgress =
    batch.signals.touchIntentScore > 0.9 && batch.signals.contentProgressPct < 0.1 ? 1 : 0;
  const lowMotionHighInteraction =
    batch.signals.motionStabilityScore < 0.2 && batch.signals.touchIntentScore > 0.8 ? 0.8 : 0;
  return clamp01(Math.max(impossibleHighTouchLowProgress, lowMotionHighInteraction));
}

function impossibleBehaviorScore(batch: PopsSignalBatch): number {
  const backgroundProgressAnomaly =
    !batch.signals.appForegrounded && batch.signals.contentProgressPct > 0.2 ? 1 : 0;
  const locationIntegrityConflict =
    batch.signals.locationClassConfidence < 0.2 && batch.signals.accountContinuityScore > 0.9 ? 0.6 : 0;
  return clamp01(Math.max(backgroundProgressAnomaly, locationIntegrityConflict));
}

export class PopsScoringService {
  score(batch: PopsSignalBatch): PopsScoringResult {
    const reasonCodes: string[] = [];

    const presenceConfidence = weightedAverage([
      { value: boolToScore(batch.signals.screenActive), weight: POPS_DEFAULT_SCORING_WEIGHTS.presence.screenActive },
      {
        value: boolToScore(batch.signals.appForegrounded),
        weight: POPS_DEFAULT_SCORING_WEIGHTS.presence.appForegrounded
      },
      {
        value: batch.signals.motionStabilityScore,
        weight: POPS_DEFAULT_SCORING_WEIGHTS.presence.motionStabilityScore
      },
      {
        value: batch.signals.visualPresenceScore ?? 0.5,
        weight: POPS_DEFAULT_SCORING_WEIGHTS.presence.visualPresenceScore
      },
      {
        value: batch.signals.accountContinuityScore,
        weight: POPS_DEFAULT_SCORING_WEIGHTS.presence.accountContinuityScore
      }
    ]);

    const interruptionPenalty = batch.signals.audioDistractionScore >= 0.6 ? 1 : 0;
    const attentionConfidence = weightedAverage([
      { value: batch.signals.contentProgressPct, weight: POPS_DEFAULT_SCORING_WEIGHTS.attention.contentProgressPct },
      { value: batch.signals.touchIntentScore, weight: POPS_DEFAULT_SCORING_WEIGHTS.attention.touchIntentScore },
      { value: boolToScore(batch.signals.screenActive), weight: POPS_DEFAULT_SCORING_WEIGHTS.attention.screenActive },
      { value: 1 - interruptionPenalty, weight: POPS_DEFAULT_SCORING_WEIGHTS.attention.interruptionPenalty }
    ]);

    const intentConfidence = weightedAverage([
      { value: batch.signals.touchIntentScore, weight: POPS_DEFAULT_SCORING_WEIGHTS.intent.touchIntentScore },
      { value: contentDwellScore(batch), weight: POPS_DEFAULT_SCORING_WEIGHTS.intent.contentDwellScore },
      { value: ctaTimingScore(batch), weight: POPS_DEFAULT_SCORING_WEIGHTS.intent.ctaTimingScore },
      { value: deliberateActionScore(batch), weight: POPS_DEFAULT_SCORING_WEIGHTS.intent.deliberateActionScore }
    ]);

    const continuityConfidence = weightedAverage([
      {
        value: batch.signals.deviceIntegrityScore,
        weight: POPS_DEFAULT_SCORING_WEIGHTS.continuity.deviceIntegrityScore
      },
      {
        value: batch.signals.accountContinuityScore,
        weight: POPS_DEFAULT_SCORING_WEIGHTS.continuity.accountContinuityScore
      },
      { value: sessionConsistencyScore(batch), weight: POPS_DEFAULT_SCORING_WEIGHTS.continuity.sessionConsistencyScore }
    ]);

    const fraudRisk = weightedAverage([
      {
        value: 1 - batch.signals.deviceIntegrityScore,
        weight: POPS_DEFAULT_SCORING_WEIGHTS.fraud.inverseDeviceIntegrity
      },
      { value: automationSignalScore(batch), weight: POPS_DEFAULT_SCORING_WEIGHTS.fraud.automationSignals },
      { value: impossibleBehaviorScore(batch), weight: POPS_DEFAULT_SCORING_WEIGHTS.fraud.impossibleBehavior }
    ]);

    if (batch.signals.deviceIntegrityScore < 0.45) reasonCodes.push("device_integrity_low");
    if (batch.signals.accountContinuityScore < 0.45) reasonCodes.push("account_continuity_low");
    if (batch.signals.audioDistractionScore >= 0.6) reasonCodes.push("interruption_detected");
    if (!batch.signals.appForegrounded) reasonCodes.push("app_backgrounded");
    if (!batch.signals.screenActive) reasonCodes.push("screen_inactive");
    if (fraudRisk >= 0.7) reasonCodes.push("fraud_risk_critical");

    return {
      presenceConfidence,
      attentionConfidence,
      intentConfidence,
      continuityConfidence,
      fraudRisk,
      reasonCodes
    };
  }
}
