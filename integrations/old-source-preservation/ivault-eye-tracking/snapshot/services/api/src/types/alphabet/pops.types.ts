export type PresenceSessionState =
  | "not_started"
  | "detecting"
  | "present_idle"
  | "engaged_passive"
  | "engaged_active"
  | "focused"
  | "distracted"
  | "interrupted"
  | "uncertain"
  | "degraded"
  | "suspicious"
  | "fraud_likely"
  | "verified_complete"
  | "reward_pending"
  | "reward_approved"
  | "reward_denied";

export type PresenceRecommendedAction =
  | "continue_tracking"
  | "pause_tracking"
  | "request_reverification"
  | "hold_reward"
  | "approve_reward"
  | "deny_reward"
  | "manual_review";

export type PresenceDecision =
  | "approved"
  | "partial"
  | "pending_review"
  | "held"
  | "denied"
  | "fraud_blocked"
  | "ineligible";

export type PresenceEventName =
  | "presence.session.started"
  | "presence.signal.batch"
  | "presence.screen.active"
  | "presence.screen.inactive"
  | "presence.touch.activity"
  | "presence.motion.activity"
  | "presence.face.present"
  | "presence.face.missing"
  | "presence.app.foreground"
  | "presence.app.background"
  | "presence.judgment.immediate"
  | "presence.judgment.near_time"
  | "presence.reward.decision.created"
  | "presence.reward.wallet_pending_created"
  | "presence.trust.event.created"
  | "presence.privacy.receipt.created"
  | "presence.session.completed";

export interface PresencePhase1SignalBatch {
  sessionId: string;
  userId: string;
  contentId?: string | null;
  campaignId?: string | null;
  clientTimestampMs: number;
  signals: {
    screenActive: boolean;
    appForeground: boolean;
    sessionDurationMs: number;
    contentProgressPct: number;
    touchEvents: number;
    touchIntentScore: number;
    motionStability: number;
    facePresent: boolean;
  };
  deviceIntegrity: {
    emulatorRisk: number;
    automationRisk: number;
    replayRisk: number;
  };
  privacy: {
    rawCameraStored: boolean;
    rawAudioStored: boolean;
    rawLocationStored: boolean;
    localFeatureExtraction: boolean;
  };
}

export interface PresenceEmotionVector {
  interest: number;
  confusion: number;
  frustration: number;
  delight: number;
}

export interface PresenceJudgment {
  sessionId: string;
  userId: string;
  presenceConfidence: number;
  attentionConfidence: number;
  intentConfidence: number;
  fraudRisk: number;
  emotionVector: PresenceEmotionVector;
  sessionState: PresenceSessionState;
  recommendedAction: PresenceRecommendedAction;
  reasons: string[];
  generatedAt: string;
}

export interface PresenceRewardDecision {
  decisionId: string;
  sessionId: string;
  userId: string;
  campaignId?: string | null;
  decision: PresenceDecision;
  coinType: "A" | "F" | "E" | "K" | "I";
  baseAmountMinor: number;
  finalAmountMinor: number;
  holdRequired: boolean;
  holdReason?: string | null;
  rewardQuality: number;
  judgment: PresenceJudgment;
  createdAt: string;
}

export interface PresenceWalletPendingInstruction {
  walletEventType: "wallet.value_lot.pending_created";
  userId: string;
  sessionId: string;
  decisionId: string;
  coinType: "A" | "F" | "E" | "K" | "I";
  amountMinor: number;
  holdRequired: boolean;
  holdReason?: string | null;
  metadata: Record<string, unknown>;
}

export interface PresenceTrustEvent {
  trustEventType:
    | "verified_human_session"
    | "high_quality_engagement"
    | "spoof_detected"
    | "automation_pattern"
    | "session_replay_detected"
    | "high_reward_low_presence_pattern";
  source: "proof_of_presence";
  userId: string;
  sessionId: string;
  weight: number;
  confidence: number;
  reason: string;
  createdAt: string;
}

export interface PresencePrivacyReceipt {
  receiptId: string;
  sessionId: string;
  userId: string;
  rawCameraStored: boolean;
  rawAudioStored: boolean;
  rawLocationStored: boolean;
  localProcessingUsed: boolean;
  rawDataDeletedAt: string | null;
  retainedFeatures: string[];
  userVisibleSummary: string;
  createdAt: string;
}
