import type { AlphabetEvent } from "./event.types";

export type GrowthDomain =
  | "learning"
  | "knowledge"
  | "mastery"
  | "work"
  | "creation"
  | "fitness"
  | "habit"
  | "general_skill";

export type GrowthVerificationStatus =
  | "growth_verified"
  | "small_growth"
  | "no_growth"
  | "regression"
  | "suspicious"
  | "incomplete";

export type GrowthSessionStatus =
  | "started"
  | "baseline_recorded"
  | "practice_recorded"
  | "after_score_recorded"
  | "verified"
  | "small_growth"
  | "no_growth"
  | "regression"
  | "suspicious"
  | "expired";

export interface GrowthSession {
  growthSessionId: string;
  userId: string;

  domain: GrowthDomain;

  objectType?: string | null;
  objectId?: string | null;

  baselineScore: number;
  afterScore?: number | null;

  practiceCount: number;
  practiceDurationMs: number;

  difficultyLevel: number;

  status: GrowthSessionStatus;

  ageBand: string;

  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface GrowthSignalInput {
  growthSessionId: string;
  userId: string;

  domain: GrowthDomain;

  baselineScore: number;
  afterScore: number;

  practiceCount: number;
  practiceDurationMs: number;

  learningScore: number;
  knowledgeScore: number;
  focusScore: number;
  masterySignalScore: number;

  difficultyLevel: number;

  repeatedAttemptCount: number;
  easyAttemptRatio: number;

  cheatingRisk: number;
  scoreManipulationRisk: number;
  repeatedAttemptFarmingRisk: number;
  deviceIntegrityScore: number;

  ageBand: string;

  metadata?: Record<string, unknown>;
}

export interface GrowthRuleSet {
  domain: GrowthDomain;

  minPracticeCount: number;
  minPracticeDurationMs: number;

  minImprovementDelta: number;
  minNormalizedGrowth: number;

  minGrowthScore: number;
  minQualityScore: number;

  maxRiskScore: number;
  maxEasyAttemptRatio: number;
  maxRepeatedAttemptCount: number;

  under13Allowed: boolean;
  teenAllowed: boolean;

  active: boolean;
}

export interface GrowthVerificationResult {
  growthSessionId: string;
  userId: string;

  status: GrowthVerificationStatus;

  improvementDelta: number;
  normalizedGrowth: number;

  growthScore: number;
  qualityScore: number;
  riskScore: number;

  reasons: string[];

  growthEvent?: AlphabetEvent | null;

  metadata: Record<string, unknown>;
}
