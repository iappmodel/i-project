import {
  POPS_PROOF_LEVEL,
  POPS_SESSION_STATE,
  POPS_SESSION_TYPE,
  type PopsSession,
  type PopsSignalBatch
} from "../../../../services/api/src/pops/types/pops.types";
import type {
  PopsPipelineEventRecord,
  PopsPipelineInput,
  PopsPipelineSignalBatch
} from "../../pops-pipeline.types";

export type PopsScenarioId =
  | "clean_paid_watch_session"
  | "partial_watch_session"
  | "background_progress"
  | "instant_completion"
  | "natural_pause_resume"
  | "notification_interruption"
  | "low_signal_quality"
  | "visual_required_disabled"
  | "visual_degraded_lighting"
  | "multiple_faces_high_value_campaign"
  | "cta_too_fast"
  | "cta_after_dwell"
  | "rage_tap_pattern"
  | "survey_impossible_speed"
  | "gps_checkin_clean"
  | "gps_mismatch"
  | "duplicate_reward_attempt"
  | "high_trust_borderline_session"
  | "low_trust_borderline_session"
  | "device_integrity_warning"
  | "kyc_required_missing"
  | "minor_user_restricted_campaign"
  | "offline_session_sync"
  | "late_events_after_completion"
  | "pipeline_failure";

export interface PopsScenarioExpected {
  sessionState: (typeof POPS_SESSION_STATE)[keyof typeof POPS_SESSION_STATE];
  confidence: {
    presence: [number, number];
    attention: [number, number];
    intent: [number, number];
    fraudRisk: [number, number];
  };
  reasonCodes: string[];
  rewardDecision: "APPROVED" | "PENDING_REVIEW" | "DENIED";
  walletIntentStatus: "READY" | "PENDING_REVIEW" | "RETRY_SCHEDULED" | "BLOCKED";
  trustImpact: "INCREASE" | "NO_CHANGE" | "DECREASE" | "PENDING";
  privacyReceiptExists: boolean;
}

export interface PopsScenarioFixture {
  id: PopsScenarioId;
  name: string;
  session: PopsSession;
  pipelineEvents: PopsPipelineEventRecord[];
  scoringBatch: PopsSignalBatch;
  pipelineSignalBatches: PopsPipelineSignalBatch[];
  pipelineInput: PopsPipelineInput;
  expected: PopsScenarioExpected;
}

interface ScenarioSeed {
  id: PopsScenarioId;
  name: string;
  progress: number;
  touchIntent: number;
  motion: number;
  visual: number | null;
  audioDistraction: number;
  appForegrounded: boolean;
  screenActive: boolean;
  deviceIntegrity: number;
  accountContinuity: number;
  locationConfidence: number;
  proofLevel?: PopsSession["proofLevel"];
  sessionType?: PopsSession["sessionType"];
  trustRisk?: number;
  trustLevel?: number;
  walletManualReview?: boolean;
  walletBlocked?: boolean;
  walletRetry?: boolean;
  eligible?: boolean;
  eligibilityReasonCodes?: string[];
  privacyVersion?: string;
  campaignOverrides?: Partial<PopsPipelineInput["campaignRequirements"]>;
  signalErrorCode?: string;
  expected: PopsScenarioExpected;
}

const baseStartedAt = 1_710_100_000_000;

const scenarioSeeds: ScenarioSeed[] = [
  {
    id: "clean_paid_watch_session",
    name: "Clean paid watch session",
    progress: 0.95,
    touchIntent: 0.56,
    motion: 0.86,
    visual: 0.9,
    audioDistraction: 0.08,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.95,
    accountContinuity: 0.95,
    locationConfidence: 0.85,
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_ACTIVE,
      confidence: {
        presence: [0.82, 1],
        attention: [0.8, 1],
        intent: [0.3, 0.7],
        fraudRisk: [0, 0.2]
      },
      reasonCodes: ["all_thresholds_met", "REWARD_APPROVED"],
      rewardDecision: "APPROVED",
      walletIntentStatus: "READY",
      trustImpact: "INCREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "partial_watch_session",
    name: "Partial watch session",
    progress: 0.55,
    touchIntent: 0.36,
    motion: 0.7,
    visual: 0.75,
    audioDistraction: 0.22,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.91,
    accountContinuity: 0.88,
    locationConfidence: 0.8,
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_PASSIVE,
      confidence: {
        presence: [0.65, 0.95],
        attention: [0.45, 0.75],
        intent: [0.2, 0.5],
        fraudRisk: [0, 0.25]
      },
      reasonCodes: ["partial_thresholds_met", "REWARD_THRESHOLD_UNMET"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "NO_CHANGE",
      privacyReceiptExists: true
    }
  },
  {
    id: "background_progress",
    name: "Background progress",
    progress: 0.8,
    touchIntent: 0.2,
    motion: 0.3,
    visual: 0.4,
    audioDistraction: 0.2,
    appForegrounded: false,
    screenActive: false,
    deviceIntegrity: 0.78,
    accountContinuity: 0.8,
    locationConfidence: 0.65,
    expected: {
      sessionState: POPS_SESSION_STATE.SUSPICIOUS,
      confidence: {
        presence: [0, 0.55],
        attention: [0.2, 0.55],
        intent: [0, 0.3],
        fraudRisk: [0.35, 0.75]
      },
      reasonCodes: ["app_backgrounded", "screen_inactive", "REWARD_THRESHOLD_UNMET"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "DECREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "instant_completion",
    name: "Instant completion",
    progress: 1,
    touchIntent: 0.98,
    motion: 0.02,
    visual: 0.2,
    audioDistraction: 0.1,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.22,
    accountContinuity: 0.6,
    locationConfidence: 0.4,
    expected: {
      sessionState: POPS_SESSION_STATE.FRAUD_LIKELY,
      confidence: {
        presence: [0.25, 0.65],
        attention: [0.4, 0.8],
        intent: [0.45, 1],
        fraudRisk: [0.65, 1]
      },
      reasonCodes: ["fraud_risk_critical", "FRAUD_RISK_OVER_LIMIT"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "DECREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "natural_pause_resume",
    name: "Natural pause/resume",
    progress: 0.94,
    touchIntent: 0.52,
    motion: 0.83,
    visual: 0.88,
    audioDistraction: 0.18,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.94,
    accountContinuity: 0.9,
    locationConfidence: 0.8,
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_ACTIVE,
      confidence: {
        presence: [0.78, 1],
        attention: [0.72, 1],
        intent: [0.28, 0.62],
        fraudRisk: [0, 0.2]
      },
      reasonCodes: ["all_thresholds_met", "REWARD_APPROVED"],
      rewardDecision: "APPROVED",
      walletIntentStatus: "READY",
      trustImpact: "INCREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "notification_interruption",
    name: "Notification interruption",
    progress: 0.9,
    touchIntent: 0.45,
    motion: 0.78,
    visual: 0.82,
    audioDistraction: 0.62,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.92,
    accountContinuity: 0.88,
    locationConfidence: 0.79,
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_PASSIVE,
      confidence: {
        presence: [0.72, 1],
        attention: [0.45, 0.8],
        intent: [0.22, 0.58],
        fraudRisk: [0.05, 0.25]
      },
      reasonCodes: ["interruption_detected", "REWARD_APPROVED"],
      rewardDecision: "APPROVED",
      walletIntentStatus: "READY",
      trustImpact: "INCREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "low_signal_quality",
    name: "Low signal quality",
    progress: 0.82,
    touchIntent: 0.3,
    motion: 0,
    visual: null,
    audioDistraction: 0.18,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.9,
    accountContinuity: 0.9,
    locationConfidence: 0.72,
    expected: {
      sessionState: POPS_SESSION_STATE.DEGRADED,
      confidence: {
        presence: [0.45, 0.82],
        attention: [0.5, 0.82],
        intent: [0.12, 0.5],
        fraudRisk: [0.05, 0.25]
      },
      reasonCodes: ["sensor_quality_degraded", "REWARD_THRESHOLD_UNMET"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "NO_CHANGE",
      privacyReceiptExists: true
    }
  },
  {
    id: "visual_required_disabled",
    name: "Visual required but disabled",
    progress: 0.88,
    touchIntent: 0.38,
    motion: 0.7,
    visual: 0.05,
    audioDistraction: 0.2,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.91,
    accountContinuity: 0.88,
    locationConfidence: 0.75,
    campaignOverrides: { minPresenceScore: 0.8, minAttentionScore: 0.75 },
    expected: {
      sessionState: POPS_SESSION_STATE.DEGRADED,
      confidence: {
        presence: [0.4, 0.7],
        attention: [0.55, 0.85],
        intent: [0.15, 0.52],
        fraudRisk: [0.05, 0.3]
      },
      reasonCodes: ["sensor_quality_degraded", "PRESENCE_BELOW_THRESHOLD"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "NO_CHANGE",
      privacyReceiptExists: true
    }
  },
  {
    id: "visual_degraded_lighting",
    name: "Visual degraded lighting",
    progress: 0.9,
    touchIntent: 0.43,
    motion: 0.72,
    visual: 0.25,
    audioDistraction: 0.2,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.9,
    accountContinuity: 0.87,
    locationConfidence: 0.74,
    expected: {
      sessionState: POPS_SESSION_STATE.DEGRADED,
      confidence: {
        presence: [0.52, 0.85],
        attention: [0.6, 0.88],
        intent: [0.15, 0.55],
        fraudRisk: [0.05, 0.28]
      },
      reasonCodes: ["sensor_quality_degraded", "REWARD_THRESHOLD_UNMET"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "NO_CHANGE",
      privacyReceiptExists: true
    }
  },
  {
    id: "multiple_faces_high_value_campaign",
    name: "Multiple faces high-value campaign",
    progress: 0.93,
    touchIntent: 0.48,
    motion: 0.76,
    visual: 0.35,
    audioDistraction: 0.22,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.86,
    accountContinuity: 0.84,
    locationConfidence: 0.71,
    proofLevel: POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE,
    campaignOverrides: { maxFraudRisk: 0.2, rewardAmountMinor: 1500 },
    walletManualReview: true,
    expected: {
      sessionState: POPS_SESSION_STATE.SUSPICIOUS,
      confidence: {
        presence: [0.5, 0.8],
        attention: [0.6, 0.9],
        intent: [0.18, 0.55],
        fraudRisk: [0.2, 0.6]
      },
      reasonCodes: ["REWARD_THRESHOLD_UNMET", "WALLET_PENDING_MANUAL_REVIEW"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "DECREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "cta_too_fast",
    name: "CTA too fast",
    progress: 0.06,
    touchIntent: 0.94,
    motion: 0.78,
    visual: 0.84,
    audioDistraction: 0.1,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.9,
    accountContinuity: 0.88,
    locationConfidence: 0.78,
    sessionType: POPS_SESSION_TYPE.PURCHASE_INTENT,
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_ACTIVE,
      confidence: {
        presence: [0.75, 1],
        attention: [0.25, 0.62],
        intent: [0.3, 0.7],
        fraudRisk: [0.05, 0.32]
      },
      reasonCodes: ["REWARD_THRESHOLD_UNMET", "INTENT_BELOW_THRESHOLD"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "NO_CHANGE",
      privacyReceiptExists: true
    }
  },
  {
    id: "cta_after_dwell",
    name: "CTA after dwell",
    progress: 0.88,
    touchIntent: 0.8,
    motion: 0.8,
    visual: 0.88,
    audioDistraction: 0.08,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.93,
    accountContinuity: 0.9,
    locationConfidence: 0.8,
    sessionType: POPS_SESSION_TYPE.PURCHASE_INTENT,
    campaignOverrides: { minIntentScore: 0.55 },
    expected: {
      sessionState: POPS_SESSION_STATE.FOCUSED,
      confidence: {
        presence: [0.8, 1],
        attention: [0.75, 1],
        intent: [0.6, 1],
        fraudRisk: [0, 0.2]
      },
      reasonCodes: ["all_thresholds_met", "REWARD_APPROVED"],
      rewardDecision: "APPROVED",
      walletIntentStatus: "READY",
      trustImpact: "INCREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "rage_tap_pattern",
    name: "Rage tap pattern",
    progress: 0.72,
    touchIntent: 0.99,
    motion: 0.12,
    visual: 0.78,
    audioDistraction: 0.25,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.8,
    accountContinuity: 0.8,
    locationConfidence: 0.7,
    sessionType: POPS_SESSION_TYPE.PURCHASE_INTENT,
    expected: {
      sessionState: POPS_SESSION_STATE.SUSPICIOUS,
      confidence: {
        presence: [0.55, 0.88],
        attention: [0.55, 0.86],
        intent: [0.3, 0.72],
        fraudRisk: [0.25, 0.7]
      },
      reasonCodes: ["REWARD_THRESHOLD_UNMET", "FRAUD_RISK_OVER_LIMIT"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "DECREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "survey_impossible_speed",
    name: "Survey impossible speed",
    progress: 1,
    touchIntent: 0.97,
    motion: 0.05,
    visual: 0.6,
    audioDistraction: 0.15,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.58,
    accountContinuity: 0.78,
    locationConfidence: 0.7,
    sessionType: POPS_SESSION_TYPE.SURVEY,
    expected: {
      sessionState: POPS_SESSION_STATE.SUSPICIOUS,
      confidence: {
        presence: [0.45, 0.85],
        attention: [0.65, 1],
        intent: [0.35, 0.9],
        fraudRisk: [0.35, 0.85]
      },
      reasonCodes: ["FRAUD_RISK_OVER_LIMIT", "REWARD_THRESHOLD_UNMET"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "DECREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "gps_checkin_clean",
    name: "GPS check-in clean",
    progress: 0.97,
    touchIntent: 0.55,
    motion: 0.86,
    visual: 0.8,
    audioDistraction: 0.08,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.95,
    accountContinuity: 0.94,
    locationConfidence: 0.95,
    sessionType: POPS_SESSION_TYPE.GPS_CHECK_IN,
    expected: {
      sessionState: POPS_SESSION_STATE.FOCUSED,
      confidence: {
        presence: [0.82, 1],
        attention: [0.82, 1],
        intent: [0.25, 0.65],
        fraudRisk: [0, 0.2]
      },
      reasonCodes: ["all_thresholds_met", "REWARD_APPROVED"],
      rewardDecision: "APPROVED",
      walletIntentStatus: "READY",
      trustImpact: "INCREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "gps_mismatch",
    name: "GPS mismatch",
    progress: 0.8,
    touchIntent: 0.42,
    motion: 0.22,
    visual: 0.7,
    audioDistraction: 0.16,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.85,
    accountContinuity: 0.94,
    locationConfidence: 0.1,
    sessionType: POPS_SESSION_TYPE.GPS_CHECK_IN,
    expected: {
      sessionState: POPS_SESSION_STATE.SUSPICIOUS,
      confidence: {
        presence: [0.55, 0.85],
        attention: [0.6, 0.9],
        intent: [0.15, 0.55],
        fraudRisk: [0.25, 0.7]
      },
      reasonCodes: ["FRAUD_RISK_OVER_LIMIT", "REWARD_THRESHOLD_UNMET"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "DECREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "duplicate_reward_attempt",
    name: "Duplicate reward attempt",
    progress: 0.94,
    touchIntent: 0.53,
    motion: 0.83,
    visual: 0.87,
    audioDistraction: 0.09,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.92,
    accountContinuity: 0.93,
    locationConfidence: 0.85,
    eligible: false,
    eligibilityReasonCodes: ["DUPLICATE_ATTEMPT"],
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_ACTIVE,
      confidence: {
        presence: [0.78, 1],
        attention: [0.75, 1],
        intent: [0.2, 0.6],
        fraudRisk: [0, 0.25]
      },
      reasonCodes: ["INELIGIBLE_PROFILE", "DUPLICATE_ATTEMPT"],
      rewardDecision: "DENIED",
      walletIntentStatus: "BLOCKED",
      trustImpact: "NO_CHANGE",
      privacyReceiptExists: true
    }
  },
  {
    id: "high_trust_borderline_session",
    name: "High-trust user borderline session",
    progress: 0.72,
    touchIntent: 0.35,
    motion: 0.58,
    visual: 0.62,
    audioDistraction: 0.28,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.9,
    accountContinuity: 0.92,
    locationConfidence: 0.78,
    trustRisk: 0.08,
    trustLevel: 5,
    campaignOverrides: { minPresenceScore: 0.62, minAttentionScore: 0.62 },
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_PASSIVE,
      confidence: {
        presence: [0.58, 0.86],
        attention: [0.5, 0.82],
        intent: [0.12, 0.45],
        fraudRisk: [0.05, 0.22]
      },
      reasonCodes: ["REWARD_APPROVED", "all_thresholds_met"],
      rewardDecision: "APPROVED",
      walletIntentStatus: "READY",
      trustImpact: "INCREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "low_trust_borderline_session",
    name: "Low-trust user borderline session",
    progress: 0.72,
    touchIntent: 0.35,
    motion: 0.58,
    visual: 0.62,
    audioDistraction: 0.28,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.8,
    accountContinuity: 0.72,
    locationConfidence: 0.65,
    trustRisk: 0.72,
    trustLevel: 1,
    walletManualReview: true,
    campaignOverrides: { minPresenceScore: 0.62, minAttentionScore: 0.62 },
    expected: {
      sessionState: POPS_SESSION_STATE.SUSPICIOUS,
      confidence: {
        presence: [0.5, 0.8],
        attention: [0.45, 0.8],
        intent: [0.1, 0.45],
        fraudRisk: [0.35, 0.8]
      },
      reasonCodes: ["REWARD_THRESHOLD_UNMET", "WALLET_PENDING_MANUAL_REVIEW"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "DECREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "device_integrity_warning",
    name: "Device integrity warning",
    progress: 0.84,
    touchIntent: 0.4,
    motion: 0.62,
    visual: 0.7,
    audioDistraction: 0.15,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.3,
    accountContinuity: 0.7,
    locationConfidence: 0.7,
    expected: {
      sessionState: POPS_SESSION_STATE.SUSPICIOUS,
      confidence: {
        presence: [0.45, 0.8],
        attention: [0.6, 0.9],
        intent: [0.12, 0.5],
        fraudRisk: [0.45, 0.9]
      },
      reasonCodes: ["device_integrity_low", "FRAUD_RISK_OVER_LIMIT"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "DECREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "kyc_required_missing",
    name: "KYC required missing",
    progress: 0.94,
    touchIntent: 0.6,
    motion: 0.82,
    visual: 0.9,
    audioDistraction: 0.09,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.93,
    accountContinuity: 0.92,
    locationConfidence: 0.82,
    proofLevel: POPS_PROOF_LEVEL.LEVEL_5_HIGH_VALUE,
    walletManualReview: true,
    campaignOverrides: { rewardAmountMinor: 2000 },
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_ACTIVE,
      confidence: {
        presence: [0.8, 1],
        attention: [0.8, 1],
        intent: [0.3, 0.75],
        fraudRisk: [0, 0.25]
      },
      reasonCodes: ["WALLET_PENDING_MANUAL_REVIEW", "REWARD_THRESHOLD_UNMET"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "NO_CHANGE",
      privacyReceiptExists: true
    }
  },
  {
    id: "minor_user_restricted_campaign",
    name: "Minor user restricted campaign",
    progress: 0.91,
    touchIntent: 0.5,
    motion: 0.8,
    visual: 0.84,
    audioDistraction: 0.09,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.9,
    accountContinuity: 0.9,
    locationConfidence: 0.8,
    eligible: false,
    eligibilityReasonCodes: ["AGE_RESTRICTED"],
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_ACTIVE,
      confidence: {
        presence: [0.75, 1],
        attention: [0.7, 1],
        intent: [0.2, 0.65],
        fraudRisk: [0, 0.25]
      },
      reasonCodes: ["INELIGIBLE_PROFILE", "AGE_RESTRICTED"],
      rewardDecision: "DENIED",
      walletIntentStatus: "BLOCKED",
      trustImpact: "NO_CHANGE",
      privacyReceiptExists: true
    }
  },
  {
    id: "offline_session_sync",
    name: "Offline session sync",
    progress: 0.88,
    touchIntent: 0.48,
    motion: 0.74,
    visual: 0.78,
    audioDistraction: 0.12,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.88,
    accountContinuity: 0.86,
    locationConfidence: 0.76,
    walletManualReview: true,
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_PASSIVE,
      confidence: {
        presence: [0.7, 0.95],
        attention: [0.65, 0.9],
        intent: [0.18, 0.6],
        fraudRisk: [0.1, 0.35]
      },
      reasonCodes: ["WALLET_PENDING_MANUAL_REVIEW", "REWARD_APPROVED"],
      rewardDecision: "APPROVED",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "INCREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "late_events_after_completion",
    name: "Late events after completion",
    progress: 0.9,
    touchIntent: 0.5,
    motion: 0.76,
    visual: 0.82,
    audioDistraction: 0.12,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.9,
    accountContinuity: 0.88,
    locationConfidence: 0.79,
    walletManualReview: true,
    expected: {
      sessionState: POPS_SESSION_STATE.ENGAGED_ACTIVE,
      confidence: {
        presence: [0.74, 0.98],
        attention: [0.68, 0.95],
        intent: [0.2, 0.62],
        fraudRisk: [0.08, 0.3]
      },
      reasonCodes: ["WALLET_PENDING_MANUAL_REVIEW", "REWARD_APPROVED"],
      rewardDecision: "APPROVED",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "INCREASE",
      privacyReceiptExists: true
    }
  },
  {
    id: "pipeline_failure",
    name: "Pipeline failure",
    progress: 0.85,
    touchIntent: 0.4,
    motion: 0.75,
    visual: 0.78,
    audioDistraction: 0.15,
    appForegrounded: true,
    screenActive: true,
    deviceIntegrity: 0.86,
    accountContinuity: 0.86,
    locationConfidence: 0.75,
    signalErrorCode: "MODEL_TIMEOUT",
    expected: {
      sessionState: POPS_SESSION_STATE.DEGRADED,
      confidence: {
        presence: [0.7, 0.95],
        attention: [0.6, 0.9],
        intent: [0.14, 0.55],
        fraudRisk: [0.1, 0.35]
      },
      reasonCodes: ["SCORING_FAILED", "REWARD_PENDING_SCORING_REVIEW"],
      rewardDecision: "PENDING_REVIEW",
      walletIntentStatus: "PENDING_REVIEW",
      trustImpact: "NO_CHANGE",
      privacyReceiptExists: true
    }
  }
];

function buildSession(seed: ScenarioSeed, index: number): PopsSession {
  const startedAt = new Date(baseStartedAt + index * 70_000).toISOString();
  const endedAt = new Date(baseStartedAt + index * 70_000 + 60_000).toISOString();
  return {
    id: `pops_session_${seed.id}`,
    userId: `user_${seed.id}`,
    deviceId: `device_${seed.id}`,
    contentId: `content_${seed.id}`,
    campaignId: `campaign_${seed.id}`,
    sessionType: seed.sessionType ?? POPS_SESSION_TYPE.SPONSORED_WATCH,
    proofLevel: seed.proofLevel ?? POPS_PROOF_LEVEL.LEVEL_3_INTENT,
    state: seed.expected.sessionState,
    startedAt,
    endedAt,
    requiredDurationMs: 60_000,
    minimumPresenceConfidence: 0.6,
    minimumAttentionConfidence: 0.6,
    minimumIntentConfidence: 0.4,
    maximumFraudRisk: 0.5,
    metadata: {
      scenarioId: seed.id,
      sessionName: seed.name
    }
  };
}

function buildScoringBatch(seed: ScenarioSeed, session: PopsSession, index: number): PopsSignalBatch {
  return {
    sessionId: session.id,
    userId: session.userId,
    timestampMs: baseStartedAt + index * 70_000 + 30_000,
    signals: {
      screenActive: seed.screenActive,
      appForegrounded: seed.appForegrounded,
      contentProgressPct: seed.progress,
      contentPositionMs: Math.round(seed.progress * 60_000),
      touchIntentScore: seed.touchIntent,
      motionStabilityScore: seed.motion,
      visualPresenceScore: seed.visual,
      audioDistractionScore: seed.audioDistraction,
      deviceIntegrityScore: seed.deviceIntegrity,
      accountContinuityScore: seed.accountContinuity,
      locationClassConfidence: seed.locationConfidence
    },
    privacy: {
      rawCameraStored: false,
      rawAudioStored: false,
      rawLocationStored: false,
      localFeatureExtractionUsed: true,
      retentionPolicy: "POPS_PRIVACY_V1"
    }
  };
}

function buildPipelineEvents(seed: ScenarioSeed, index: number): PopsPipelineEventRecord[] {
  const start = baseStartedAt + index * 70_000;
  return [
    { type: "attention.session.started", timestampMs: start + 100 },
    {
      type: "attention.runtime_signal.sampled",
      timestampMs: start + 10_000,
      confidence: Math.max(0.2, seed.progress * 0.9)
    },
    {
      type: "attention.session.completed",
      timestampMs: start + 60_000
    }
  ];
}

function buildPipelineInput(
  seed: ScenarioSeed,
  session: PopsSession,
  scoringBatch: PopsSignalBatch,
  events: PopsPipelineEventRecord[]
): PopsPipelineInput {
  const signalBatch: PopsPipelineSignalBatch = {
    timestampMs: scoringBatch.timestampMs,
    presenceScore: seed.screenActive ? (seed.appForegrounded ? Math.max(seed.motion, 0.25) : 0.2) : 0.1,
    attentionScore: seed.progress * (seed.appForegrounded ? 1 : 0.5),
    intentScore: seed.touchIntent * Math.max(seed.progress, 0.2),
    continuityScore: (seed.deviceIntegrity + seed.accountContinuity) / 2,
    fraudSignals: Math.max(
      0,
      Math.min(1, (1 - seed.deviceIntegrity) * 0.7 + (!seed.appForegrounded && seed.progress > 0.2 ? 0.5 : 0))
    ),
    scoringErrorCode: seed.signalErrorCode
  };

  return {
    session: {
      id: session.id,
      userId: session.userId,
      campaignId: session.campaignId ?? `campaign_${seed.id}`,
      startedAtMs: Date.parse(session.startedAt),
      endedAtMs: Date.parse(session.endedAt ?? session.startedAt) + 1,
      contentId: session.contentId ?? `content_${seed.id}`
    },
    events,
    signalBatches: [signalBatch],
    campaignRequirements: {
      minPresenceScore: 0.65,
      minAttentionScore: 0.65,
      minIntentScore: 0.45,
      minContinuityScore: 0.65,
      maxFraudRisk: 0.45,
      rewardAmountMinor: 250,
      currency: "USD",
      holdOnMediumRisk: true,
      trustFailureBlocksRelease: false,
      ...seed.campaignOverrides
    },
    userTrustProfile: {
      level: seed.trustLevel ?? 3,
      riskScore: seed.trustRisk ?? 0.2
    },
    walletRiskProfile: {
      blocked: seed.walletBlocked ?? false,
      requiresManualReview: seed.walletManualReview ?? false,
      retryableIntegrationFailure: seed.walletRetry ?? false
    },
    eligibilityProfile: {
      eligible: seed.eligible ?? true,
      reasonCodes: seed.eligibilityReasonCodes ?? ["ELIGIBLE_STANDARD_RULES"]
    },
    privacyPolicy: {
      version: seed.privacyVersion ?? "POPS_PRIVACY_V1",
      allowRawSensitiveStorageByDefault: false,
      retentionDays: 30
    }
  };
}

export const popsScenarioFixtures: PopsScenarioFixture[] = scenarioSeeds.map((seed, index) => {
  const session = buildSession(seed, index);
  const scoringBatch = buildScoringBatch(seed, session, index);
  const events = buildPipelineEvents(seed, index);
  const pipelineInput = buildPipelineInput(seed, session, scoringBatch, events);
  return {
    id: seed.id,
    name: seed.name,
    session,
    pipelineEvents: events,
    scoringBatch,
    pipelineSignalBatches: pipelineInput.signalBatches,
    pipelineInput,
    expected: seed.expected
  };
});

export const popsScenarioIds: PopsScenarioId[] = popsScenarioFixtures.map((scenario) => scenario.id);

export function getPopsScenarioFixture(id: PopsScenarioId): PopsScenarioFixture {
  const fixture = popsScenarioFixtures.find((scenario) => scenario.id === id);
  if (!fixture) throw new Error(`Scenario fixture not found: ${id}`);
  return fixture;
}
