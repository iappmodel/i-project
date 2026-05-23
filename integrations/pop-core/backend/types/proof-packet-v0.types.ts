import type { PopsProofLevel, PopsSessionState } from "./pops.types.js";

export const PROOF_PACKET_VERSION = "0" as const;

export type ProofReviewStatus = "pending" | "approved" | "partial" | "rejected" | "escalated";

export type VerificationConfidenceBand = "POOR" | "WARMING" | "USABLE" | "STRONG";

export interface ProofSignalSummary {
  score: number;
  confidence: number;
  notes?: string;
}

export interface VerificationStabilityProofSnapshot {
  stableZone: string;
  confidenceBand: VerificationConfidenceBand;
  validFrameRatio: number;
  zoneConsistency: number;
  dwellReadiness: number;
  blinkConfidence: number;
  fpsConfidence: number;
  reason: string;
  sampleCount: number;
  windowMs: number;
}

export interface StableGazeWindow {
  startedAtMs: number;
  endedAtMs: number;
  zone: string;
  confidence: number;
}

export interface DwellEvent {
  zone: string;
  startedAtMs: number;
  endedAtMs: number;
  satisfied: boolean;
}

export interface BlinkEvent {
  timestampMs: number;
  detected: boolean;
}

export interface EyeTrackingProofSummary {
  facePresentRatio: number;
  stableGazeWindows: StableGazeWindow[];
  dwellEvents: DwellEvent[];
  blinkEvents: BlinkEvent[];
  verificationStabilitySnapshot: VerificationStabilityProofSnapshot;
  calibrationConfidence: number;
  invalidFrameRatio: number;
  processedFpsAvg: number;
}

export interface InteractionTiming {
  firstInteractionMs?: number;
  lastInteractionMs?: number;
  cadenceScore?: number;
}

export interface InteractionProofSummary {
  taps: number;
  scrolls: number;
  playbackStarted: boolean;
  playbackCompleted: boolean;
  foregroundRatio: number;
  interactionTiming: InteractionTiming;
}

export interface ProofReviewResult {
  status: ProofReviewStatus;
  reviewedAt?: string | null;
  reasons: string[];
  layerOutcomes?: Record<string, string> | null;
  settlementAmount?: number | null;
}

export interface ProofPacketV0 {
  packetVersion: typeof PROOF_PACKET_VERSION;
  sessionId: string;
  userId?: string | null;
  localUserRef: string;
  offerId: string;
  contentId: string;
  deviceId?: string | null;
  deviceIdHash: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  appVersion: string;
  runtimeVersion: string;
  signals: Record<string, ProofSignalSummary>;
  eyeTracking: EyeTrackingProofSummary;
  interaction: InteractionProofSummary;
  review: ProofReviewResult;
}

export interface ProofPacketDecisionOverrides {
  sessionId?: string;
  userId?: string;
  proofLevel?: PopsProofLevel;
  state?: PopsSessionState;
}
