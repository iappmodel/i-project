import type { Json } from "./database.types";

export type TrustImpactEventType =
  | "safe_action_allowed"
  | "safe_action_blocked"
  | string;

export type TrustImpactCategory = "reputation" | string;

export type TrustImpactSeverity =
  | "positive_small"
  | "negative_small"
  | string;

export interface TrustImpactEvent {
  userId: string;
  eventType: TrustImpactEventType;
  category: TrustImpactCategory;
  severity: TrustImpactSeverity;
  sourceEventId: string | null;
  confidence: number;
  metadata: Json;
}

export interface TrustImpactRule {
  eventType: TrustImpactEventType;
  category: TrustImpactCategory;
  severity: TrustImpactSeverity;
  trustDelta: number;
  fraudRiskDelta: number;
  safetyRiskDelta: number;
  paymentRiskDelta: number;
  reputationDelta: number;
  verificationDelta: number;
  canFreezeWallet: boolean;
  canFreezeWithdrawals: boolean;
  canFreezeCampaigns: boolean;
  active: boolean;
}
