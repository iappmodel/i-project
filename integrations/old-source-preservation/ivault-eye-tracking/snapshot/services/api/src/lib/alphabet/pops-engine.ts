import type {
  PresenceJudgment,
  PresencePhase1SignalBatch,
  PresencePrivacyReceipt,
  PresenceRecommendedAction,
  PresenceRewardDecision,
  PresenceSessionState,
  PresenceTrustEvent,
  PresenceWalletPendingInstruction
} from "../../types/alphabet/pops.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function nowIso(): string {
  return new Date().toISOString();
}

export const POPS_EVENT_NAMES = {
  sessionStarted: "presence.session.started",
  signalBatch: "presence.signal.batch",
  screenActive: "presence.screen.active",
  screenInactive: "presence.screen.inactive",
  touchActivity: "presence.touch.activity",
  motionActivity: "presence.motion.activity",
  facePresent: "presence.face.present",
  faceMissing: "presence.face.missing",
  appForeground: "presence.app.foreground",
  appBackground: "presence.app.background",
  immediateJudgment: "presence.judgment.immediate",
  nearTimeJudgment: "presence.judgment.near_time",
  rewardDecisionCreated: "presence.reward.decision.created",
  walletPendingCreated: "presence.reward.wallet_pending_created",
  trustEventCreated: "presence.trust.event.created",
  privacyReceiptCreated: "presence.privacy.receipt.created",
  sessionCompleted: "presence.session.completed"
} as const;

export const PRESENCE_SESSION_TRANSITIONS: Record<
  PresenceSessionState,
  PresenceSessionState[]
> = {
  not_started: ["detecting"],
  detecting: ["present_idle", "uncertain", "degraded", "interrupted", "suspicious"],
  present_idle: [
    "engaged_passive",
    "engaged_active",
    "distracted",
    "interrupted",
    "degraded",
    "suspicious"
  ],
  engaged_passive: [
    "focused",
    "engaged_active",
    "distracted",
    "interrupted",
    "degraded",
    "suspicious",
    "verified_complete"
  ],
  engaged_active: [
    "focused",
    "engaged_passive",
    "distracted",
    "interrupted",
    "degraded",
    "suspicious",
    "verified_complete"
  ],
  focused: [
    "engaged_active",
    "engaged_passive",
    "distracted",
    "interrupted",
    "verified_complete",
    "reward_pending"
  ],
  distracted: [
    "engaged_passive",
    "engaged_active",
    "focused",
    "interrupted",
    "degraded",
    "suspicious"
  ],
  interrupted: ["detecting", "present_idle", "uncertain", "degraded", "suspicious"],
  uncertain: ["detecting", "present_idle", "degraded", "suspicious"],
  degraded: ["detecting", "uncertain", "suspicious", "interrupted"],
  suspicious: ["fraud_likely", "reward_pending", "reward_denied"],
  fraud_likely: ["reward_denied"],
  verified_complete: ["reward_pending", "reward_approved", "reward_denied"],
  reward_pending: ["reward_approved", "reward_denied"],
  reward_approved: [],
  reward_denied: []
};

export function canTransitionPresenceSessionState(
  from: PresenceSessionState,
  to: PresenceSessionState
): boolean {
  return PRESENCE_SESSION_TRANSITIONS[from].includes(to);
}

function deriveSessionState(params: {
  screenActive: boolean;
  appForeground: boolean;
  facePresent: boolean;
  motionStability: number;
  contentProgressPct: number;
  touchEvents: number;
  touchIntentScore: number;
  fraudRisk: number;
  presenceConfidence: number;
  attentionConfidence: number;
}): PresenceSessionState {
  const {
    screenActive,
    appForeground,
    facePresent,
    motionStability,
    contentProgressPct,
    touchEvents,
    touchIntentScore,
    fraudRisk,
    presenceConfidence,
    attentionConfidence
  } = params;

  if (!screenActive || !appForeground) return "interrupted";
  if (fraudRisk >= 0.75) return "fraud_likely";
  if (fraudRisk >= 0.5) return "suspicious";
  if (motionStability < 0.25) return "degraded";
  if (presenceConfidence < 0.45) return "uncertain";
  if (!facePresent && contentProgressPct < 0.15) return "detecting";
  if (attentionConfidence >= 0.85 && presenceConfidence >= 0.85) return "focused";
  if (attentionConfidence < 0.45) return "distracted";
  if (touchEvents > 0 && touchIntentScore >= 0.6) return "engaged_active";
  if (contentProgressPct >= 0.2) return "engaged_passive";
  return "present_idle";
}

function deriveRecommendedAction(
  sessionState: PresenceSessionState,
  fraudRisk: number
): PresenceRecommendedAction {
  if (sessionState === "fraud_likely") return "deny_reward";
  if (sessionState === "suspicious" || fraudRisk >= 0.5) return "hold_reward";
  if (sessionState === "degraded" || sessionState === "uncertain") {
    return "request_reverification";
  }
  if (sessionState === "interrupted") return "pause_tracking";
  return "continue_tracking";
}

export function buildPhase1PresenceJudgment(
  signalBatch: PresencePhase1SignalBatch
): PresenceJudgment {
  const reasons: string[] = [];

  const progressScore = clamp(signalBatch.signals.contentProgressPct / 100);
  const screenScore = signalBatch.signals.screenActive ? 1 : 0;
  const appScore = signalBatch.signals.appForeground ? 1 : 0;
  const faceScore = signalBatch.signals.facePresent ? 1 : 0.2;
  const motionScore = clamp(signalBatch.signals.motionStability);
  const touchActivityScore = clamp(signalBatch.signals.touchEvents / 20);
  const touchIntentScore = clamp(signalBatch.signals.touchIntentScore);

  const presenceConfidence = clamp(
    screenScore * 0.3 + appScore * 0.2 + faceScore * 0.2 + motionScore * 0.15 + progressScore * 0.15
  );
  const attentionConfidence = clamp(
    progressScore * 0.45 + faceScore * 0.2 + screenScore * 0.15 + motionScore * 0.1 + touchActivityScore * 0.1
  );
  const intentConfidence = clamp(
    touchIntentScore * 0.5 + touchActivityScore * 0.25 + progressScore * 0.15 + appScore * 0.1
  );

  const fraudRisk = clamp(
    signalBatch.deviceIntegrity.emulatorRisk * 0.4 +
      signalBatch.deviceIntegrity.automationRisk * 0.35 +
      signalBatch.deviceIntegrity.replayRisk * 0.25 +
      (signalBatch.signals.screenActive ? 0 : 0.2)
  );

  if (!signalBatch.signals.screenActive) reasons.push("screen_inactive");
  if (!signalBatch.signals.appForeground) reasons.push("app_backgrounded");
  if (!signalBatch.signals.facePresent) reasons.push("face_missing_or_low_visibility");
  if (signalBatch.deviceIntegrity.emulatorRisk >= 0.5) reasons.push("emulator_risk_high");
  if (signalBatch.deviceIntegrity.automationRisk >= 0.5) reasons.push("automation_risk_high");
  if (signalBatch.deviceIntegrity.replayRisk >= 0.5) reasons.push("replay_risk_high");

  const sessionState = deriveSessionState({
    screenActive: signalBatch.signals.screenActive,
    appForeground: signalBatch.signals.appForeground,
    facePresent: signalBatch.signals.facePresent,
    motionStability: motionScore,
    contentProgressPct: progressScore,
    touchEvents: signalBatch.signals.touchEvents,
    touchIntentScore,
    fraudRisk,
    presenceConfidence,
    attentionConfidence
  });
  const recommendedAction = deriveRecommendedAction(sessionState, fraudRisk);

  return {
    sessionId: signalBatch.sessionId,
    userId: signalBatch.userId,
    presenceConfidence,
    attentionConfidence,
    intentConfidence,
    fraudRisk,
    emotionVector: {
      interest: clamp(attentionConfidence * 0.75 + progressScore * 0.25),
      confusion: clamp((1 - intentConfidence) * 0.6 + (1 - progressScore) * 0.4),
      frustration: clamp((1 - motionScore) * 0.35 + (1 - touchIntentScore) * 0.65),
      delight: clamp(intentConfidence * 0.5 + progressScore * 0.5)
    },
    sessionState,
    recommendedAction,
    reasons,
    generatedAt: nowIso()
  };
}

export function buildPresenceRewardDecision(params: {
  judgment: PresenceJudgment;
  campaignId?: string | null;
  coinType?: "A" | "F" | "E" | "K" | "I";
  baseAmountMinor: number;
  sessionCompletionScore?: number;
}): PresenceRewardDecision {
  const sessionCompletionScore = clamp(params.sessionCompletionScore ?? params.judgment.attentionConfidence);
  const rewardQuality = clamp(
    params.judgment.presenceConfidence * 0.35 +
      params.judgment.attentionConfidence * 0.3 +
      params.judgment.intentConfidence * 0.2 +
      sessionCompletionScore * 0.15 -
      params.judgment.fraudRisk * 0.4
  );

  let decision: PresenceRewardDecision["decision"] = "pending_review";
  let holdRequired = false;
  let holdReason: string | null = null;

  if (params.judgment.fraudRisk >= 0.75) {
    decision = "fraud_blocked";
    holdRequired = false;
    holdReason = "fraud_risk_critical";
  } else if (params.judgment.fraudRisk >= 0.5) {
    decision = "held";
    holdRequired = true;
    holdReason = "fraud_risk_high";
  } else if (rewardQuality >= 0.85 && params.judgment.fraudRisk < 0.15) {
    decision = "approved";
  } else if (rewardQuality >= 0.65 && params.judgment.fraudRisk < 0.3) {
    decision = "partial";
    holdRequired = true;
    holdReason = "quality_mid_band_manual_review";
  } else if (rewardQuality >= 0.45) {
    decision = "pending_review";
    holdRequired = true;
    holdReason = "quality_low_confidence";
  } else {
    decision = "denied";
    holdRequired = false;
    holdReason = "quality_below_threshold";
  }

  const multiplier = decision === "approved" ? 1 : decision === "partial" ? 0.5 : 0;
  const finalAmountMinor = Math.max(0, Math.round(params.baseAmountMinor * multiplier));

  return {
    decisionId: createId("presence_reward_decision"),
    sessionId: params.judgment.sessionId,
    userId: params.judgment.userId,
    campaignId: params.campaignId ?? null,
    decision,
    coinType: params.coinType ?? "A",
    baseAmountMinor: params.baseAmountMinor,
    finalAmountMinor,
    holdRequired,
    holdReason,
    rewardQuality,
    judgment: params.judgment,
    createdAt: nowIso()
  };
}

export function buildWalletPendingInstruction(
  decision: PresenceRewardDecision
): PresenceWalletPendingInstruction | null {
  if (decision.finalAmountMinor <= 0) return null;
  if (decision.decision === "denied" || decision.decision === "fraud_blocked") return null;

  return {
    walletEventType: "wallet.value_lot.pending_created",
    userId: decision.userId,
    sessionId: decision.sessionId,
    decisionId: decision.decisionId,
    coinType: decision.coinType,
    amountMinor: decision.finalAmountMinor,
    holdRequired: decision.holdRequired,
    holdReason: decision.holdReason ?? null,
    metadata: {
      source: "proof_of_presence_phase1",
      rewardQuality: decision.rewardQuality,
      presenceConfidence: decision.judgment.presenceConfidence,
      attentionConfidence: decision.judgment.attentionConfidence,
      intentConfidence: decision.judgment.intentConfidence,
      fraudRisk: decision.judgment.fraudRisk
    }
  };
}

export function buildTrustEventFromDecision(
  decision: PresenceRewardDecision
): PresenceTrustEvent {
  if (decision.decision === "fraud_blocked") {
    return {
      trustEventType: "spoof_detected",
      source: "proof_of_presence",
      userId: decision.userId,
      sessionId: decision.sessionId,
      weight: -0.2,
      confidence: clamp(decision.judgment.fraudRisk),
      reason: "Strong fraud indicators triggered a reward block.",
      createdAt: nowIso()
    };
  }

  if (decision.decision === "held") {
    return {
      trustEventType: "automation_pattern",
      source: "proof_of_presence",
      userId: decision.userId,
      sessionId: decision.sessionId,
      weight: -0.08,
      confidence: clamp(decision.judgment.fraudRisk),
      reason: "Potential automation pattern detected; reward is held.",
      createdAt: nowIso()
    };
  }

  if (decision.decision === "approved" || decision.decision === "partial") {
    return {
      trustEventType: "verified_human_session",
      source: "proof_of_presence",
      userId: decision.userId,
      sessionId: decision.sessionId,
      weight: decision.decision === "approved" ? 0.04 : 0.02,
      confidence: clamp(
        (decision.judgment.presenceConfidence +
          decision.judgment.attentionConfidence +
          decision.judgment.intentConfidence) /
          3
      ),
      reason: "High-confidence session with acceptable fraud risk.",
      createdAt: nowIso()
    };
  }

  return {
    trustEventType: "high_reward_low_presence_pattern",
    source: "proof_of_presence",
    userId: decision.userId,
    sessionId: decision.sessionId,
    weight: -0.03,
    confidence: clamp(1 - decision.rewardQuality),
    reason: "Reward request quality is too low for automatic approval.",
    createdAt: nowIso()
  };
}

export function buildPrivacyReceipt(
  signalBatch: PresencePhase1SignalBatch
): PresencePrivacyReceipt {
  const deletedAt =
    signalBatch.privacy.localFeatureExtraction &&
    !signalBatch.privacy.rawCameraStored &&
    !signalBatch.privacy.rawAudioStored &&
    !signalBatch.privacy.rawLocationStored
      ? nowIso()
      : null;

  return {
    receiptId: createId("presence_privacy_receipt"),
    sessionId: signalBatch.sessionId,
    userId: signalBatch.userId,
    rawCameraStored: signalBatch.privacy.rawCameraStored,
    rawAudioStored: signalBatch.privacy.rawAudioStored,
    rawLocationStored: signalBatch.privacy.rawLocationStored,
    localProcessingUsed: signalBatch.privacy.localFeatureExtraction,
    rawDataDeletedAt: deletedAt,
    retainedFeatures: [
      "screenActive",
      "appForeground",
      "sessionDurationMs",
      "contentProgressPct",
      "touchEvents",
      "touchIntentScore",
      "motionStability",
      "facePresent",
      "emulatorRisk",
      "automationRisk",
      "replayRisk"
    ],
    userVisibleSummary:
      "Presence verification used temporary device signals and stored only structured scores. Raw camera/audio/location capture was not retained by default.",
    createdAt: nowIso()
  };
}
