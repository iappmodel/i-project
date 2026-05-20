import type { AlphabetEvent } from "./event.types";

export type FocusSessionPurpose =
  | "learning"
  | "work"
  | "creation"
  | "campaign"
  | "mastery"
  | "general";

export type FocusVerificationStatus =
  | "verified"
  | "weak"
  | "distracted"
  | "suspicious"
  | "incomplete";

export type FocusSessionStatus =
  | "started"
  | "completed"
  | "verified"
  | "weak"
  | "distracted"
  | "suspicious"
  | "expired";

export interface FocusSession {
  focusSessionId: string;
  userId: string;
  purpose: FocusSessionPurpose;
  objectType?: string | null;
  objectId?: string | null;
  intendedDurationMs: number;
  focusedDurationMs: number;
  status: FocusSessionStatus;
  ageBand: string;
  startedAt: string;
  completedAt?: string | null;
  updatedAt: string;
}

export interface FocusSignalInput {
  focusSessionId: string;
  userId: string;
  purpose: FocusSessionPurpose;
  focusedDurationMs: number;
  intendedDurationMs: number;
  interruptionCount: number;
  appSwitchCount: number;
  idleTimeMs: number;
  scrollNoiseScore: number;
  taskContinuityScore: number;
  interactionCoherenceScore: number;
  attentionStabilityScore: number;
  deviceIntegrityScore: number;
  sessionContinuityScore: number;
  botSignalScore: number;
  automationRisk: number;
  duplicateSessionRisk: number;
  ageBand: string;
  metadata?: Record<string, unknown>;
}

export interface FocusRuleSet {
  purpose: FocusSessionPurpose;
  minFocusedRatio: number;
  minFocusedDurationMs: number;
  maxInterruptionCount: number;
  maxAppSwitchCount: number;
  maxIdleRatio: number;
  minTaskContinuityScore: number;
  minInteractionCoherenceScore: number;
  minAttentionStabilityScore: number;
  minDeviceIntegrityScore: number;
  maxDistractionScore: number;
  maxRiskScore: number;
  under13Allowed: boolean;
  teenAllowed: boolean;
  active: boolean;
}

export interface FocusVerificationResult {
  focusSessionId: string;
  userId: string;
  status: FocusVerificationStatus;
  focusDepthScore: number;
  focusQualityScore: number;
  distractionScore: number;
  riskScore: number;
  focusedRatio: number;
  focusMultiplier: number;
  reasons: string[];
  event: AlphabetEvent;
  fCoinEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
