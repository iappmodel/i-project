import type { PopsProofLevel } from "../config/pops-config.types";

export type PopsSecurityEventType =
  | "SESSION_STARTED"
  | "CONTENT_STARTED"
  | "CONTENT_PROGRESS"
  | "REWARD_CHECKPOINT"
  | "SESSION_COMPLETED"
  | "APP_FOREGROUNDED"
  | "APP_BACKGROUNDED"
  | "SESSION_CLOSED";

export interface PopsSessionTokenClaims {
  sessionId: string;
  userId: string;
  deviceId: string;
  campaignId: string;
  startedAtMs: number;
  expiresAtMs: number;
}

export interface PopsEventEnvelope {
  eventId: string;
  eventType: PopsSecurityEventType;
  sessionId: string;
  userId: string;
  deviceId: string;
  campaignId: string;
  clientTimestampMs: number;
  serverReceivedAtMs?: number;
  sequence: number;
  payload: Record<string, unknown>;
}

export interface PopsTimestampIntegrityState {
  previousClientTimestampMs?: number;
  previousServerTimestampMs?: number;
  driftMs?: number;
  maxObservedDriftMs: number;
  impossibleJumpDetected: boolean;
  lateArrivalDetected: boolean;
}

export interface PopsSessionIntegritySnapshot {
  sessionId: string;
  started: boolean;
  contentStarted: boolean;
  completed: boolean;
  closed: boolean;
  startedAtMs?: number;
  contentStartedAtMs?: number;
  completedAtMs?: number;
  rewardCheckpointCount: number;
  acceptedEventIds: Set<string>;
  lastSequence: number;
  timestampIntegrity: PopsTimestampIntegrityState;
}

export interface PopsSequenceValidationContext {
  requiredDurationMs: number;
  nowMs: number;
}

export interface PopsSequenceValidationResult {
  accepted: boolean;
  reasons: string[];
}

export interface PopsReplaySignalBatch {
  batchId: string;
  sessionId: string;
  userId: string;
  deviceId: string;
  timingSignature: string;
  signalDigest: string;
  createdAtMs: number;
}

export interface PopsReplayProtectionResult {
  accepted: boolean;
  reasons: string[];
}

export interface PopsDeviceRiskInput {
  deviceId: string;
  userId: string;
  emulator: boolean;
  rootedOrJailbroken: boolean;
  automationFrameworkDetected: boolean;
  debugMode: boolean;
  accessibilityAutomationSuspected: boolean;
  installAgeHours: number;
  sessionsLast24h: number;
}

export interface PopsDeviceRiskResult {
  score: number;
  reasons: string[];
  riskTier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface PopsPayloadValidationOptions {
  maxPayloadBytes: number;
  allowlistedEventTypes: PopsSecurityEventType[];
  allowlistedProofLevels: PopsProofLevel[];
  allowRawMediaUpload: boolean;
}

export interface PopsPayloadValidationResult {
  accepted: boolean;
  reasons: string[];
}

export interface PopsRateLimitRule {
  key: string;
  max: number;
  windowMs: number;
}

export interface PopsRateLimitDecision {
  allowed: boolean;
  retryAfterMs: number;
}

export interface PopsAdminOverrideInput {
  adminUserId: string;
  adminRoles: string[];
  reason?: string;
  rewardMutationRequested: boolean;
  atMs: number;
}

export interface PopsAdminOverrideDecision {
  allowed: boolean;
  reasons: string[];
  auditRecord?: PopsAdminOverrideAuditRecord;
}

export interface PopsAdminOverrideAuditRecord {
  id: string;
  adminUserId: string;
  reason: string;
  rewardMutationRequested: boolean;
  atMs: number;
}

export interface PopsRewardIdempotencyInput {
  sessionId: string;
  campaignId: string;
  userId: string;
  campaignAllowsDuplicateRewards: boolean;
}

export interface PopsRewardIdempotencyResult {
  allowed: boolean;
  reasons: string[];
}
