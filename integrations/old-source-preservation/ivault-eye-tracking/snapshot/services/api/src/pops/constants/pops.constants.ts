import { POPS_PROOF_LEVEL } from "../types/pops.types";
import { POPS_PRIVACY_POLICY } from "../types/pops-privacy.types";

export const POPS_NAME = "P.O.P.S";
export const POPS_EXPANDED_NAME = "Proof Of Presence System";

export const POPS_CORE_PRODUCT_SENTENCE =
  "P.O.P.S validates the humane factor integrated on the moment.";

export const POPS_CORE_TECHNICAL_SENTENCE =
  "P.O.P.S converts temporary human-device-session signals into structured confidence scores, fraud risk, reward eligibility, trust impact, and privacy receipts.";

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

export const POPS_DEFAULT_POLICY_BY_PROOF_LEVEL = {
  [POPS_PROOF_LEVEL.LEVEL_0_NONE]: POPS_PRIVACY_POLICY.DISCARD_RAW,
  [POPS_PROOF_LEVEL.LEVEL_1_SESSION]: POPS_PRIVACY_POLICY.LOCAL_ONLY,
  [POPS_PROOF_LEVEL.LEVEL_2_ATTENTION]: POPS_PRIVACY_POLICY.STORE_FEATURES_ONLY,
  [POPS_PROOF_LEVEL.LEVEL_3_INTENT]: POPS_PRIVACY_POLICY.STORE_WITH_CONSENT,
  [POPS_PROOF_LEVEL.LEVEL_4_IDENTITY_CONTINUITY]: POPS_PRIVACY_POLICY.STORE_FOR_KYC_REVIEW,
  [POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE]: POPS_PRIVACY_POLICY.STORE_FOR_FRAUD_REVIEW
} as const;
