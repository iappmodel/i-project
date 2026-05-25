import { POPS_PROOF_LEVEL } from "../types/pops.types.js";

export interface PopsProofThresholds {
  minimumPresence: number;
  minimumAttention: number;
  minimumIntent: number;
  minimumContinuity?: number;
  maximumFraudRisk: number;
}

export const POPS_PROOF_THRESHOLDS: Record<string, PopsProofThresholds> = {
  [POPS_PROOF_LEVEL.LEVEL_0_NONE]: {
    minimumPresence: 0,
    minimumAttention: 0,
    minimumIntent: 0,
    maximumFraudRisk: 1
  },
  [POPS_PROOF_LEVEL.LEVEL_1_SESSION]: {
    minimumPresence: 0.5,
    minimumAttention: 0.3,
    minimumIntent: 0.2,
    maximumFraudRisk: 0.6
  },
  [POPS_PROOF_LEVEL.LEVEL_2_ATTENTION]: {
    minimumPresence: 0.65,
    minimumAttention: 0.6,
    minimumIntent: 0.3,
    maximumFraudRisk: 0.4
  },
  [POPS_PROOF_LEVEL.LEVEL_3_INTENT]: {
    minimumPresence: 0.7,
    minimumAttention: 0.65,
    minimumIntent: 0.65,
    maximumFraudRisk: 0.3
  },
  [POPS_PROOF_LEVEL.LEVEL_4_IDENTITY_CONTINUITY]: {
    minimumPresence: 0.75,
    minimumAttention: 0.6,
    minimumIntent: 0.6,
    minimumContinuity: 0.75,
    maximumFraudRisk: 0.25
  },
  [POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE]: {
    minimumPresence: 0.85,
    minimumAttention: 0.75,
    minimumIntent: 0.75,
    minimumContinuity: 0.85,
    maximumFraudRisk: 0.15
  }
};

export const POPS_DEFAULT_SCORING_WEIGHTS = {
  presence: {
    screenActive: 0.2,
    appForegrounded: 0.15,
    motionStabilityScore: 0.2,
    visualPresenceScore: 0.25,
    accountContinuityScore: 0.2
  },
  attention: {
    contentProgressPct: 0.35,
    touchIntentScore: 0.25,
    screenActive: 0.15,
    interruptionPenalty: 0.25
  },
  intent: {
    touchIntentScore: 0.4,
    contentDwellScore: 0.25,
    ctaTimingScore: 0.2,
    deliberateActionScore: 0.15
  },
  continuity: {
    deviceIntegrityScore: 0.4,
    accountContinuityScore: 0.35,
    sessionConsistencyScore: 0.25
  },
  fraud: {
    inverseDeviceIntegrity: 0.45,
    automationSignals: 0.35,
    impossibleBehavior: 0.2
  }
} as const;
