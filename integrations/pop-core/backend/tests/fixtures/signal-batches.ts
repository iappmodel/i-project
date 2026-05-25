import type { PopsSignalBatch } from "../../types/pops.types.js";

const defaultPrivacy = {
  rawCameraStored: false,
  rawAudioStored: false,
  rawLocationStored: false,
  localFeatureExtractionUsed: true,
  retentionPolicy: "STANDARD"
} as const;

function baseBatch(sessionId: string, userId: string, signals: PopsSignalBatch["signals"]): PopsSignalBatch {
  return {
    sessionId,
    userId,
    timestampMs: Date.now(),
    signals,
    privacy: { ...defaultPrivacy }
  };
}

export const strongEngagedBatch = baseBatch("sess_strong", "user_1", {
  screenActive: true,
  appForegrounded: true,
  contentProgressPct: 0.72,
  contentPositionMs: 12000,
  touchIntentScore: 0.65,
  motionStabilityScore: 0.8,
  visualPresenceScore: 0.85,
  audioDistractionScore: 0.15,
  deviceIntegrityScore: 0.92,
  accountContinuityScore: 0.88,
  locationClassConfidence: 0.75
});

export const backgroundProgressAnomalyBatch = baseBatch("sess_anomaly", "user_2", {
  screenActive: true,
  appForegrounded: false,
  contentProgressPct: 0.45,
  contentPositionMs: 8000,
  touchIntentScore: 0.5,
  motionStabilityScore: 0.6,
  visualPresenceScore: 0.7,
  audioDistractionScore: 0.1,
  deviceIntegrityScore: 0.85,
  accountContinuityScore: 0.8,
  locationClassConfidence: 0.6
});

export const lowPresenceBatch = baseBatch("sess_low_presence", "user_3", {
  screenActive: false,
  appForegrounded: false,
  contentProgressPct: 0.05,
  contentPositionMs: 1000,
  touchIntentScore: 0.1,
  motionStabilityScore: 0.3,
  visualPresenceScore: 0.2,
  audioDistractionScore: 0.1,
  deviceIntegrityScore: 0.7,
  accountContinuityScore: 0.6,
  locationClassConfidence: 0.5
});

export const criticalFraudBatch = baseBatch("sess_fraud", "user_4", {
  screenActive: true,
  appForegrounded: true,
  contentProgressPct: 0.05,
  contentPositionMs: 2000,
  touchIntentScore: 0.95,
  motionStabilityScore: 0.1,
  visualPresenceScore: 0.5,
  audioDistractionScore: 0.05,
  deviceIntegrityScore: 0.15,
  accountContinuityScore: 0.95,
  locationClassConfidence: 0.1
});

export const partialThresholdBatch = baseBatch("sess_partial", "user_5", {
  screenActive: true,
  appForegrounded: true,
  contentProgressPct: 0.12,
  contentPositionMs: 2500,
  touchIntentScore: 0.55,
  motionStabilityScore: 0.65,
  visualPresenceScore: 0.72,
  audioDistractionScore: 0.2,
  deviceIntegrityScore: 0.85,
  accountContinuityScore: 0.8,
  locationClassConfidence: 0.65
});
