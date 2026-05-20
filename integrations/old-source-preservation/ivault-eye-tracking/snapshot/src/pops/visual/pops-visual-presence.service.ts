import {
  type PopsVisualPresenceComputation,
  type PopsVisualPresenceState,
  type PopsVisualScoringContext,
  type PopsVisualScoringWeights,
  type PopsVisualSignal,
  type PopsVisualSignalInput,
} from "./pops-visual-presence.types";

const MAX_SCORE = 100;
const MIN_SCORE = 0;
const SHORT_GLANCE_AWAY_MS = 3000;
const LONG_ABSENCE_MS = 12000;

const DEFAULT_WEIGHTS: PopsVisualScoringWeights = {
  facePresent: 32,
  visualQuality: 18,
  headPoseStability: 14,
  blinkNaturalness: 10,
  gazeEstimate: 10,
  spoofRiskPenalty: 20,
  occlusionPenalty: 8,
  multipleFacesPenalty: 10,
};

const DEFAULT_SIGNAL: PopsVisualSignal = {
  timestampMs: 0,
  facePresent: false,
  faceCount: 0,
  visualQuality: 0,
  lightingQuality: 0,
  cameraOcclusionRisk: 0,
  headPoseStability: 0,
  eyeOpennessScore: 0,
  gazeTowardScreenEstimate: 0,
  blinkNaturalnessScore: 0,
  visualAttentionEstimate: 0,
  spoofRiskEstimate: 0,
  identityContinuityEstimate: 0,
  rawFrameStored: false,
  localProcessingUsed: true,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clamp100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(value)));
}

function normalizeSignal(input: PopsVisualSignalInput): PopsVisualSignal {
  return {
    timestampMs: input.timestampMs ?? Date.now(),
    facePresent: Boolean(input.facePresent),
    faceCount: Math.max(0, Math.round(input.faceCount ?? 0)),
    visualQuality: clamp01(input.visualQuality ?? 0),
    lightingQuality: clamp01(input.lightingQuality ?? 0),
    cameraOcclusionRisk: clamp01(input.cameraOcclusionRisk ?? 0),
    headPoseStability: clamp01(input.headPoseStability ?? 0),
    eyeOpennessScore: clamp01(input.eyeOpennessScore ?? 0),
    gazeTowardScreenEstimate: clamp01(input.gazeTowardScreenEstimate ?? 0),
    blinkNaturalnessScore: clamp01(input.blinkNaturalnessScore ?? 0),
    visualAttentionEstimate: clamp01(input.visualAttentionEstimate ?? 0),
    spoofRiskEstimate: clamp01(input.spoofRiskEstimate ?? 0),
    identityContinuityEstimate: clamp01(input.identityContinuityEstimate ?? 0),
    rawFrameStored: Boolean(input.rawFrameStored),
    localProcessingUsed: input.localProcessingUsed ?? true,
  };
}

function computeState(signal: PopsVisualSignal): PopsVisualPresenceState {
  if (!signal.facePresent) return "FACE_MISSING";
  if (signal.spoofRiskEstimate >= 0.75) return "SPOOF_RISK";
  if (signal.faceCount > 1) return "MULTIPLE_FACES";
  if (signal.cameraOcclusionRisk >= 0.65) return "DEGRADED_OCCLUSION";
  if (signal.lightingQuality < 0.35) return "DEGRADED_LIGHTING";
  return "FACE_PRESENT";
}

function decayToward(previous: number, next: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return next;
  const decayHalfLifeMs = 14000;
  const decay = Math.exp((-Math.log(2) * elapsedMs) / decayHalfLifeMs);
  return previous * decay + next * (1 - decay);
}

export class PopsVisualPresenceService {
  private readonly weights: PopsVisualScoringWeights;
  private lastSignal?: PopsVisualSignal;
  private lastComputedScore = 0;
  private repeatedLongAbsenceCount = 0;
  private lastFacePresentAt?: number;

  constructor(weights?: Partial<PopsVisualScoringWeights>) {
    this.weights = {
      ...DEFAULT_WEIGHTS,
      ...weights,
    };
  }

  compute(
    input: PopsVisualSignalInput,
    context?: PopsVisualScoringContext,
  ): PopsVisualPresenceComputation {
    const signal = normalizeSignal(input);
    const state = computeState(signal);

    if (signal.facePresent) {
      this.lastFacePresentAt = signal.timestampMs;
    }

    const elapsedSinceFacePresentMs =
      context?.elapsedSinceFacePresentMs ??
      (this.lastFacePresentAt ? signal.timestampMs - this.lastFacePresentAt : LONG_ABSENCE_MS + 1);

    if (!signal.facePresent && elapsedSinceFacePresentMs > LONG_ABSENCE_MS) {
      this.repeatedLongAbsenceCount += 1;
    } else if (signal.facePresent) {
      this.repeatedLongAbsenceCount = Math.max(0, this.repeatedLongAbsenceCount - 1);
    }

    const facePresentContribution = signal.facePresent ? this.weights.facePresent : 0;
    const visualQualityContribution = signal.visualQuality * this.weights.visualQuality;
    const headPoseContribution = signal.headPoseStability * this.weights.headPoseStability;
    const blinkContribution = signal.blinkNaturalnessScore * this.weights.blinkNaturalness;

    // Gaze is intentionally soft-weighted so normal glances and accessibility usage are not punished.
    const gazeContribution =
      signal.gazeTowardScreenEstimate * this.weights.gazeEstimate * (context?.campaignRequiresVisualProof ? 1 : 0.35);

    let spoofPenalty = signal.spoofRiskEstimate * this.weights.spoofRiskPenalty;
    let occlusionPenalty = signal.cameraOcclusionRisk * this.weights.occlusionPenalty;
    let multipleFacesPenalty = signal.faceCount > 1 ? this.weights.multipleFacesPenalty : 0;

    if (!context?.highValueRewardFlow && signal.faceCount > 1) {
      multipleFacesPenalty *= 0.5;
    }

    if (!signal.facePresent) {
      const shortGlance = elapsedSinceFacePresentMs <= SHORT_GLANCE_AWAY_MS;
      const longAbsence = elapsedSinceFacePresentMs > LONG_ABSENCE_MS;
      if (shortGlance) {
        // Brief glance-away is normal and should not be meaningfully penalized.
        occlusionPenalty *= 0.25;
      } else if (longAbsence) {
        occlusionPenalty += Math.min(10, this.repeatedLongAbsenceCount * 1.5);
      }
    }

    // Poor lighting degrades confidence but is not treated as fraud.
    if (signal.lightingQuality < 0.35) {
      occlusionPenalty += (0.35 - signal.lightingQuality) * 10;
    }

    const immediateScore = clamp100(
      facePresentContribution +
        visualQualityContribution +
        headPoseContribution +
        blinkContribution +
        gazeContribution -
        spoofPenalty -
        occlusionPenalty -
        multipleFacesPenalty,
    );

    const elapsedMs = this.lastSignal ? Math.max(0, signal.timestampMs - this.lastSignal.timestampMs) : 0;
    const decayedScore = clamp100(decayToward(this.lastComputedScore, immediateScore, elapsedMs));

    const continuityBase =
      signal.identityContinuityEstimate * 0.7 + (signal.facePresent ? 0.2 : 0) + (signal.localProcessingUsed ? 0.1 : 0);
    const continuityPenalty =
      signal.facePresent || elapsedSinceFacePresentMs <= SHORT_GLANCE_AWAY_MS
        ? 0
        : Math.min(0.35, this.repeatedLongAbsenceCount * 0.06);
    const visualContinuityScore = clamp01(continuityBase - continuityPenalty);

    const holdSuggested =
      (context?.highValueRewardFlow === true && signal.faceCount > 1) ||
      signal.spoofRiskEstimate >= 0.78 ||
      (signal.faceCount > 1 && signal.spoofRiskEstimate >= 0.6);

    const denySuggested = signal.spoofRiskEstimate >= 0.9 && (context?.proofLevel === "STRONG" || holdSuggested);

    const reasons: string[] = [];
    if (!signal.facePresent && context?.progressAdvancing) {
      reasons.push("FACE_MISSING_WHILE_PROGRESSING");
    }
    if (state === "DEGRADED_LIGHTING") reasons.push("DEGRADED_LIGHTING");
    if (state === "DEGRADED_OCCLUSION") reasons.push("DEGRADED_OCCLUSION");
    if (state === "MULTIPLE_FACES") reasons.push("MULTIPLE_FACES");
    if (state === "SPOOF_RISK") reasons.push("SPOOF_RISK");
    if (signal.rawFrameStored) reasons.push("RAW_FRAME_STORED");
    if (!signal.localProcessingUsed) reasons.push("LOCAL_PROCESSING_DISABLED");

    this.lastSignal = signal;
    this.lastComputedScore = decayedScore;

    return {
      state,
      visualPresenceScore: decayedScore,
      visualQuality: signal.visualQuality,
      visualSpoofRisk: signal.spoofRiskEstimate,
      visualContinuityScore,
      breakdown: {
        facePresentWeight: facePresentContribution,
        visualQualityWeight: visualQualityContribution,
        headPoseStabilityWeight: headPoseContribution,
        blinkNaturalnessWeight: blinkContribution,
        gazeEstimateWeight: gazeContribution,
        spoofRiskPenalty: spoofPenalty,
        occlusionPenalty,
        multipleFacesPenalty,
      },
      holdSuggested,
      denySuggested,
      reasons,
    };
  }

  getLastSignal(): PopsVisualSignal {
    return this.lastSignal ?? { ...DEFAULT_SIGNAL, timestampMs: Date.now() };
  }

  getRepeatedLongAbsenceCount(): number {
    return this.repeatedLongAbsenceCount;
  }

  reset(): void {
    this.lastSignal = undefined;
    this.lastComputedScore = 0;
    this.repeatedLongAbsenceCount = 0;
    this.lastFacePresentAt = undefined;
  }
}

export function computeVisualPresenceScore(
  signal: PopsVisualSignalInput,
  context?: PopsVisualScoringContext,
): PopsVisualPresenceComputation {
  const service = new PopsVisualPresenceService();
  return service.compute(signal, context);
}

export function toPopsVisualSignalFields(computation: PopsVisualPresenceComputation): {
  "signals.visualPresenceScore": number;
  "signals.visualQuality": number;
  "signals.visualSpoofRisk": number;
  "signals.visualContinuityScore": number;
} {
  return {
    "signals.visualPresenceScore": computation.visualPresenceScore,
    "signals.visualQuality": computation.visualQuality,
    "signals.visualSpoofRisk": computation.visualSpoofRisk,
    "signals.visualContinuityScore": computation.visualContinuityScore,
  };
}

