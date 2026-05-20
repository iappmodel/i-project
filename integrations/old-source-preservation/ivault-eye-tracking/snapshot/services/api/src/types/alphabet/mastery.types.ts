import type { AlphabetEvent } from "./event.types";

export type MasteryDomain =
  | "learning"
  | "knowledge"
  | "creation"
  | "work"
  | "skill"
  | "art"
  | "fitness"
  | "mentorship"
  | "general";

export type MasteryVerificationStatus =
  | "mastery_verified"
  | "emerging_mastery"
  | "insufficient_evidence"
  | "inconsistent"
  | "suspicious"
  | "failed";

export type MasteryPathStatus =
  | "started"
  | "evidence_recorded"
  | "verified"
  | "emerging"
  | "insufficient_evidence"
  | "inconsistent"
  | "suspicious"
  | "failed"
  | "expired";

export interface MasteryPath {
  masteryPathId: string;
  userId: string;

  domain: MasteryDomain;

  objectType?: string | null;
  objectId?: string | null;

  attemptCount: number;
  successfulAttemptCount: number;

  startedAt: string;
  firstEvidenceAt?: string | null;
  lastEvidenceAt?: string | null;
  completedAt?: string | null;

  status: MasteryPathStatus;

  ageBand: string;

  createdAt: string;
  updatedAt: string;
}

export interface MasteryEvidenceInput {
  masteryPathId: string;
  userId: string;

  domain: MasteryDomain;

  attemptCount: number;
  successfulAttemptCount: number;

  averagePerformanceScore: number;
  peakPerformanceScore: number;
  consistencyScore: number;

  difficultyLevel: number;

  qualityScore: number;
  growthScore: number;
  knowledgeScore: number;
  focusScore: number;

  expertValidationScore: number;
  peerValidationScore: number;
  systemValidationScore: number;

  evidenceSpanDays: number;

  cheatingRisk: number;
  shortcutRisk: number;
  validationManipulationRisk: number;
  deviceIntegrityScore: number;

  ageBand: string;

  metadata?: Record<string, unknown>;
}

export interface MasteryRuleSet {
  domain: MasteryDomain;

  minAttemptCount: number;
  minSuccessfulAttemptCount: number;
  minSuccessRate: number;

  minAveragePerformanceScore: number;
  minPeakPerformanceScore: number;
  minConsistencyScore: number;

  minDifficultyLevel: number;
  minQualityScore: number;

  minEvidenceSpanDays: number;

  minValidationScore: number;
  minDurabilityScore: number;
  minMasteryScore: number;

  maxRiskScore: number;

  under13Allowed: boolean;
  teenAllowed: boolean;

  active: boolean;
}

export interface MasteryVerificationResult {
  masteryPathId: string;
  userId: string;

  status: MasteryVerificationStatus;

  successRate: number;

  masteryScore: number;
  durabilityScore: number;
  validationScore: number;
  riskScore: number;

  reasons: string[];

  masteryEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
