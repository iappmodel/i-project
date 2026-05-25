import type { ProofPacketDecisionOverrides, ProofPacketV0 } from "../types/proof-packet-v0.types.js";
import type { PopsDecisionInput, PopsScoringResult } from "../types/pops-decisions.types.js";
import type { PopsSignalBatch } from "../types/pops.types.js";
import { POPS_PROOF_LEVEL, POPS_SESSION_STATE } from "../types/pops.types.js";

const PROOF_PACKET_V0_ADAPTER_DEFAULTS = {
  audioDistractionScore: 0.15,
  accountContinuityScore: 0.88,
  locationClassConfidence: 0.75,
  foregroundActiveThreshold: 0.5,
  privacy: {
    rawCameraStored: false,
    rawAudioStored: false,
    rawLocationStored: false,
    localFeatureExtractionUsed: true,
    retentionPolicy: "STANDARD"
  },
  decision: {
    proofLevel: POPS_PROOF_LEVEL.LEVEL_2_ATTENTION
  }
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(4))));
}

function resolveUserId(packet: ProofPacketV0): string {
  return packet.userId ?? packet.localUserRef;
}

function resolveTimestampMs(packet: ProofPacketV0): number {
  const endedAtMs = Date.parse(packet.endedAt);
  if (Number.isFinite(endedAtMs)) {
    return endedAtMs;
  }

  const startedAtMs = Date.parse(packet.startedAt);
  if (Number.isFinite(startedAtMs)) {
    return startedAtMs + packet.durationMs;
  }

  return Date.now();
}

function signalLayerScore(packet: ProofPacketV0, key: string): number | undefined {
  return packet.signals[key]?.score;
}

function deriveSessionState(packet: ProofPacketV0) {
  const { interaction } = packet;

  if (interaction.playbackCompleted && interaction.foregroundRatio >= 0.9) {
    return POPS_SESSION_STATE.COMPLETED;
  }
  if (interaction.playbackStarted) {
    return POPS_SESSION_STATE.FOCUSED;
  }
  if (interaction.foregroundRatio >= PROOF_PACKET_V0_ADAPTER_DEFAULTS.foregroundActiveThreshold) {
    return POPS_SESSION_STATE.ENGAGED_ACTIVE;
  }
  return POPS_SESSION_STATE.ENGAGED_PASSIVE;
}

function mapMotionStabilityScore(packet: ProofPacketV0): number {
  const snapshot = packet.eyeTracking.verificationStabilitySnapshot;
  if (snapshot) {
    return clamp01(snapshot.zoneConsistency * 0.5 + snapshot.validFrameRatio * 0.5);
  }

  return clamp01(signalLayerScore(packet, "signalIntegrity") ?? 0);
}

function mapTouchIntentScore(packet: ProofPacketV0): number {
  const cadenceScore = packet.interaction.interactionTiming.cadenceScore;
  if (typeof cadenceScore === "number" && Number.isFinite(cadenceScore)) {
    return clamp01(cadenceScore);
  }

  const participationScore = signalLayerScore(packet, "participation");
  if (typeof participationScore === "number" && Number.isFinite(participationScore)) {
    return clamp01(participationScore);
  }

  return clamp01(packet.interaction.taps / 5);
}

function mapContentProgressPct(packet: ProofPacketV0): number {
  if (packet.interaction.playbackCompleted) {
    return 1;
  }

  return clamp01(signalLayerScore(packet, "participation") ?? 0);
}

function mapContentPositionMs(packet: ProofPacketV0): number {
  const lastInteractionMs = packet.interaction.interactionTiming.lastInteractionMs;
  if (typeof lastInteractionMs === "number" && Number.isFinite(lastInteractionMs)) {
    return lastInteractionMs;
  }

  return packet.durationMs;
}

export function proofPacketV0ToPopsSignalBatch(packet: ProofPacketV0): PopsSignalBatch {
  const foregroundRatio = packet.interaction.foregroundRatio;
  const isForegroundActive =
    foregroundRatio >= PROOF_PACKET_V0_ADAPTER_DEFAULTS.foregroundActiveThreshold;

  return {
    sessionId: packet.sessionId,
    userId: resolveUserId(packet),
    timestampMs: resolveTimestampMs(packet),
    signals: {
      screenActive: isForegroundActive,
      appForegrounded: isForegroundActive,
      contentProgressPct: mapContentProgressPct(packet),
      contentPositionMs: mapContentPositionMs(packet),
      touchIntentScore: mapTouchIntentScore(packet),
      motionStabilityScore: mapMotionStabilityScore(packet),
      visualPresenceScore: clamp01(packet.eyeTracking.facePresentRatio),
      audioDistractionScore: PROOF_PACKET_V0_ADAPTER_DEFAULTS.audioDistractionScore,
      deviceIntegrityScore: clamp01(signalLayerScore(packet, "signalIntegrity") ?? 0),
      accountContinuityScore: PROOF_PACKET_V0_ADAPTER_DEFAULTS.accountContinuityScore,
      locationClassConfidence: PROOF_PACKET_V0_ADAPTER_DEFAULTS.locationClassConfidence
    },
    privacy: { ...PROOF_PACKET_V0_ADAPTER_DEFAULTS.privacy }
  };
}

export function proofPacketV0ToDecisionInput(
  packet: ProofPacketV0,
  scoringResult: PopsScoringResult,
  overrides?: ProofPacketDecisionOverrides
): PopsDecisionInput {
  return {
    ...scoringResult,
    sessionId: overrides?.sessionId ?? packet.sessionId,
    userId: overrides?.userId ?? resolveUserId(packet),
    proofLevel: overrides?.proofLevel ?? PROOF_PACKET_V0_ADAPTER_DEFAULTS.decision.proofLevel,
    state: overrides?.state ?? deriveSessionState(packet)
  };
}
