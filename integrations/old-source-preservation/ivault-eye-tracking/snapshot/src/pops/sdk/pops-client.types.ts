export type PopsSdkState =
  | "idle"
  | "starting"
  | "active"
  | "paused"
  | "degraded"
  | "completing"
  | "pending_sync"
  | "completed"
  | "failed"
  | "cancelled";

export type PopsSdkEventType =
  | "session_started"
  | "event_buffered"
  | "event_flushed"
  | "checkpoint_received"
  | "confidence_updated"
  | "reward_progress_updated"
  | "session_degraded"
  | "session_completed"
  | "reward_decision_received"
  | "privacy_receipt_created"
  | "error";

export type PopsPrivacyMode = "strict" | "balanced" | "campaign_required";
export type PopsProofLevel =
  | "LEVEL_1_SESSION"
  | "LEVEL_2_ATTENTION"
  | "LEVEL_3_INTENT"
  | "LEVEL_4_IDENTITY_CONTINUITY"
  | "LEVEL_5_HIGH_VALUE";
export type PopsSessionType = "feed" | "earn" | "wallet" | "campaign" | "creator" | "brand";
export type PopsNetworkType = "unknown" | "none" | "wifi" | "cellular" | "ethernet";
export type PopsBatteryState = "unknown" | "charging" | "discharging" | "full";
export type PopsIntegrityStatus = "unknown" | "trusted" | "warning" | "compromised";

export type PopsRewardExpectation = {
  amountMinor: number;
  currency: "USD" | "ICOIN" | "VCOIN" | "RCOIN";
};

export type PopsStartMomentInput = {
  userId: string;
  deviceId: string;
  contentId: string;
  campaignId: string;
  sessionType: PopsSessionType;
  proofLevel: PopsProofLevel;
  requiredDurationMs: number;
  expectedReward: PopsRewardExpectation;
  privacyMode: PopsPrivacyMode;
};

export type PopsRecordContentProgressInput = {
  sessionId: string;
  progressPct: number;
  elapsedMs: number;
  contentPositionMs?: number;
};

export type PopsRecordInteractionInput = {
  sessionId: string;
  interactionType: string;
  interactionValue?: number | string | boolean;
  metadata?: Record<string, unknown>;
};

export type PopsCancelReason =
  | "user_cancelled"
  | "app_backgrounded_too_long"
  | "network_unavailable"
  | "integrity_warning"
  | "timeout"
  | "other";

export type PopsSdkEvent = {
  type: PopsSdkEventType;
  sessionId?: string;
  timestampMs: number;
  payload?: Record<string, unknown>;
};

export type PopsMomentStatus = {
  sessionId: string;
  state: PopsSdkState;
  syncedEvents: number;
  pendingEvents: number;
  rewardDecision?: "pending" | "approved" | "denied" | "manual_review";
  rewardAmountMinor?: number;
  rewardCurrency?: PopsRewardExpectation["currency"];
  updatedAtMs: number;
};

export type PopsPrivacyReceipt = {
  id: string;
  sessionId: string;
  policyVersion: string;
  dataCategories: string[];
  privacyFlags: string[];
  createdAtMs: number;
};

export type PopsClockDriftSample = {
  localSentAtMs: number;
  localReceivedAtMs: number;
  serverTimeMs: number;
  driftMs: number;
  roundTripMs: number;
};

export type PopsSdkSignalInput = {
  signalType: string;
  value?: number | string | boolean;
  metadata?: Record<string, unknown>;
};

export type PopsSdkSessionEvent =
  | {
      kind: "progress";
      progressPct: number;
      elapsedMs: number;
      contentPositionMs?: number;
    }
  | {
      kind: "interaction";
      interactionType: string;
      interactionValue?: number | string | boolean;
      metadata?: Record<string, unknown>;
    }
  | {
      kind: "checkpoint";
    }
  | {
      kind: "signal";
      signalType: string;
      value?: number | string | boolean;
      metadata?: Record<string, unknown>;
    }
  | {
      kind: "control";
      action: "pause" | "resume" | "complete" | "cancel";
      reason?: string;
    };

export type PopsQueuedEnvelope = {
  id: string;
  dedupeKey: string;
  sessionId: string;
  createdAtMs: number;
  expiresAtMs: number;
  attempts: number;
  event: PopsSdkSessionEvent;
};

export type PopsDeviceContext = {
  appVersion: string;
  os: string;
  deviceModelClass: string;
  timezone: string;
  networkType: PopsNetworkType;
  batteryState: PopsBatteryState;
  batteryLevelPct?: number;
  lowPowerMode?: boolean;
  screenActive: boolean;
  appForegrounded: boolean;
  integrityStatus: PopsIntegrityStatus;
  lowBatteryMode: boolean;
  poorNetworkMode: boolean;
};

export type PopsNetworkRequestOptions = {
  timeoutMs?: number;
  headers?: Record<string, string>;
};

export interface PopsNetworkAdapter {
  startMoment(
    input: PopsStartMomentInput,
    context: PopsDeviceContext,
    options?: PopsNetworkRequestOptions,
  ): Promise<{
    sessionId: string;
    serverTimeMs?: number;
    checkpointToken?: string;
  }>;
  sendEvents(
    sessionId: string,
    events: PopsSdkSessionEvent[],
    options?: PopsNetworkRequestOptions,
  ): Promise<{
    acceptedCount: number;
    serverTimeMs?: number;
  }>;
  checkpoint(sessionId: string, options?: PopsNetworkRequestOptions): Promise<{ checkpointId: string }>;
  completeMoment(sessionId: string, options?: PopsNetworkRequestOptions): Promise<{
    status: "pending" | "completed";
    rewardDecision?: PopsMomentStatus["rewardDecision"];
  }>;
  cancelMoment(
    sessionId: string,
    reason: PopsCancelReason | string,
    options?: PopsNetworkRequestOptions,
  ): Promise<{ cancelled: true }>;
  getMomentStatus(sessionId: string, options?: PopsNetworkRequestOptions): Promise<PopsMomentStatus>;
  getPrivacyReceipt(sessionId: string, options?: PopsNetworkRequestOptions): Promise<PopsPrivacyReceipt>;
}

export type PopsStorageAdapter = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
};

export type PopsClientConfig = {
  appVersion: string;
  apiBaseUrl: string;
  authToken?: string;
  environment?: "dev" | "staging" | "prod";
  batchSize?: number;
  flushIntervalMs?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  maxRetries?: number;
  queueTtlMs?: number;
  maxQueueSizePerSession?: number;
  lowBatteryThresholdPct?: number;
  poorNetworkTypes?: PopsNetworkType[];
  storage?: PopsStorageAdapter;
  networkAdapter?: PopsNetworkAdapter;
  now?: () => number;
  randomId?: () => string;
  onEvent?: (event: PopsSdkEvent) => void;
};

export type PopsSessionSnapshot = {
  sessionId: string;
  state: PopsSdkState;
  startedAtMs: number;
  requiredDurationMs: number;
  progressPct: number;
  confidence?: number;
  rewardProgressPct?: number;
  pendingSync: boolean;
  privacyFlags: string[];
  lastError?: string;
};

export type PopsSessionListener = (snapshot: PopsSessionSnapshot, event?: PopsSdkEvent) => void;
