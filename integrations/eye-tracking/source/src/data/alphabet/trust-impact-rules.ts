import type { TrustImpactRule } from "@/types/alphabet/trust.types";

export const TRUST_IMPACT_RULES: TrustImpactRule[] = [
  {
    eventType: "safe_action_allowed",
    category: "reputation",
    severity: "positive_small",
    trustDelta: 0.01,
    fraudRiskDelta: 0,
    safetyRiskDelta: -0.01,
    paymentRiskDelta: -0.01,
    reputationDelta: 0.01,
    verificationDelta: 0.01,
    canFreezeWallet: false,
    canFreezeWithdrawals: false,
    canFreezeCampaigns: false,
    active: true
  },
  {
    eventType: "safe_action_blocked",
    category: "reputation",
    severity: "negative_small",
    trustDelta: -0.05,
    fraudRiskDelta: 0.02,
    safetyRiskDelta: 0.02,
    paymentRiskDelta: 0.04,
    reputationDelta: -0.02,
    verificationDelta: -0.01,
    canFreezeWallet: false,
    canFreezeWithdrawals: false,
    canFreezeCampaigns: false,
    active: true
  }
];
