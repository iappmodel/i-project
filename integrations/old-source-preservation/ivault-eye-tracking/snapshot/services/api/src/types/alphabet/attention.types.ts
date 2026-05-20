import type { AlphabetEvent } from "./event.types";

export type AttentionSessionContext =
  | "campaign"
  | "learning"
  | "creator_content"
  | "feed"
  | "igo"
  | "system";

export type AttentionVerificationStatus =
  | "verified"
  | "rejected"
  | "suspicious"
  | "incomplete";

export type AttentionSessionStatus =
  | "started"
  | "completed"
  | "verified"
  | "rejected"
  | "suspicious"
  | "expired";

export interface AttentionSession {
  attentionSessionId: string;
  userId: string;

  context: AttentionSessionContext;

  objectType: string;
  objectId: string;

  campaignId?: string | null;
  creatorId?: string | null;

  requiredDurationMs: number;
  watchedDurationMs: number;

  status: AttentionSessionStatus;

  ageBand: string;

  startedAt: string;
  completedAt?: string | null;
  updatedAt: string;
}

export interface AttentionSignalInput {
  attentionSessionId: string;
  userId: string;

  watchedDurationMs: number;
  requiredDurationMs: number;

  visibilityPercent: number;
  foregroundPercent: number;

  focusStabilityScore: number;
  scrollStabilityScore: number;
  interactionIntegrityScore: number;

  muted: boolean;
  skipped: boolean;
  replayLoopDetected: boolean;
  tabHidden: boolean;
  screenOffDetected: boolean;

  deviceIntegrityScore: number;
  sessionContinuityScore: number;
  networkIntegrityScore: number;

  botSignalScore: number;
  duplicateSessionRisk: number;
  velocityRisk: number;
  emulatorRisk: number;

  ageBand: string;
  context: AttentionSessionContext;

  metadata?: Record<string, unknown>;
}

export interface AttentionRuleSet {
  context: AttentionSessionContext;

  minWatchedRatio: number;
  minVisibilityPercent: number;
  minForegroundPercent: number;
  minFocusStabilityScore: number;
  minDeviceIntegrityScore: number;
  maxRiskScore: number;

  allowMuted: boolean;
  allowSkipped: boolean;
  allowReplayLoop: boolean;

  under13Allowed: boolean;
  teenAllowed: boolean;

  active: boolean;
}

export interface AttentionVerificationResult {
  attentionSessionId: string;
  userId: string;

  status: AttentionVerificationStatus;

  rawAttentionScore: number;
  qualityScore: number;
  riskScore: number;

  watchedRatio: number;

  reasons: string[];

  event: AlphabetEvent;

  metadata: Record<string, unknown>;
}
