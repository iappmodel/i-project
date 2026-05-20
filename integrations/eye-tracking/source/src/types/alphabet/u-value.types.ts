import type { Json } from "./database.types";

export type UValueImpactEventType =
  | "safe_action_allowed"
  | "safe_action_blocked"
  | string;

export type UValueImpactCategory = "trust" | string;

export type UValueImpactSeverity =
  | "positive_small"
  | "negative_small"
  | string;

export interface UValueImpactEvent {
  userId: string;
  eventType: UValueImpactEventType;
  category: UValueImpactCategory;
  severity: UValueImpactSeverity;
  coinCode: string;
  sourceEventId: string | null;
  confidence: number;
  metadata: Json;
}

export interface UValueImpactRule {
  eventType: UValueImpactEventType;
  category: UValueImpactCategory;
  severity: UValueImpactSeverity;
  uValueDelta: number;
  contributionDelta: number;
  learningDelta: number;
  creationDelta: number;
  helpDelta: number;
  trustDelta: number;
  safetyDelta: number;
  masteryDelta: number;
  communityDelta: number;
  economicDelta: number;
  originalityDelta: number;
  yieldDelta: number;
  canTriggerGrantEligibility: boolean;
  canTriggerScholarshipEligibility: boolean;
  canTriggerRareRewardEligibility: boolean;
  canTriggerProtectionEligibility: boolean;
  canTriggerBoostEligibility: boolean;
  active: boolean;
}
