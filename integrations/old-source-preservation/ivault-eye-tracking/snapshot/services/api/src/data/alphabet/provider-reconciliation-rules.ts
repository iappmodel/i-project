import type { ProviderReconciliationRuleSet } from "@/types/alphabet/provider-reconciliation.types";

const bankLike: Omit<ProviderReconciliationRuleSet, "provider"> = {
  requiresWebhookSignature: true,
  allowsPolling: true,
  allowsManualAdminCheck: true,
  duplicateEventIgnored: true,
  minSourceTrustScore: 0.92,
  minSignatureConfidenceScore: 0.95,
  minTransferMatchScore: 0.92,
  minStatusConfidenceScore: 0.9,
  maxReplayRiskScore: 0.2,
  minCompensationTriggerSafetyScore: 0.98,
  minReconciliationConfidenceScore: 0.92,
  minReconciliationSafetyScore: 0.95,
  active: true
};

export const PROVIDER_RECONCILIATION_RULES: ProviderReconciliationRuleSet[] = [
  {
    provider: "mock",
    requiresWebhookSignature: false,
    allowsPolling: true,
    allowsManualAdminCheck: true,
    duplicateEventIgnored: true,
    minSourceTrustScore: 0.7,
    minSignatureConfidenceScore: 0,
    minTransferMatchScore: 0.75,
    minStatusConfidenceScore: 0.75,
    maxReplayRiskScore: 0.5,
    minCompensationTriggerSafetyScore: 0.9,
    minReconciliationConfidenceScore: 0.75,
    minReconciliationSafetyScore: 0.75,
    active: true
  },
  {
    provider: "stripe",
    requiresWebhookSignature: true,
    allowsPolling: true,
    allowsManualAdminCheck: true,
    duplicateEventIgnored: true,
    minSourceTrustScore: 0.9,
    minSignatureConfidenceScore: 0.95,
    minTransferMatchScore: 0.9,
    minStatusConfidenceScore: 0.9,
    maxReplayRiskScore: 0.25,
    minCompensationTriggerSafetyScore: 0.95,
    minReconciliationConfidenceScore: 0.9,
    minReconciliationSafetyScore: 0.92,
    active: true
  },
  {
    provider: "paypal",
    requiresWebhookSignature: true,
    allowsPolling: true,
    allowsManualAdminCheck: true,
    duplicateEventIgnored: true,
    minSourceTrustScore: 0.88,
    minSignatureConfidenceScore: 0.92,
    minTransferMatchScore: 0.88,
    minStatusConfidenceScore: 0.88,
    maxReplayRiskScore: 0.3,
    minCompensationTriggerSafetyScore: 0.95,
    minReconciliationConfidenceScore: 0.88,
    minReconciliationSafetyScore: 0.9,
    active: true
  },
  {
    ...bankLike,
    provider: "bank_ach"
  },
  {
    ...bankLike,
    provider: "bank_wire"
  },
  {
    provider: "crypto",
    requiresWebhookSignature: true,
    allowsPolling: true,
    allowsManualAdminCheck: true,
    duplicateEventIgnored: true,
    minSourceTrustScore: 0.9,
    minSignatureConfidenceScore: 0.95,
    minTransferMatchScore: 0.9,
    minStatusConfidenceScore: 0.88,
    maxReplayRiskScore: 0.25,
    minCompensationTriggerSafetyScore: 0.96,
    minReconciliationConfidenceScore: 0.9,
    minReconciliationSafetyScore: 0.93,
    active: true
  },
  {
    provider: "internal",
    requiresWebhookSignature: false,
    allowsPolling: true,
    allowsManualAdminCheck: true,
    duplicateEventIgnored: true,
    minSourceTrustScore: 0.8,
    minSignatureConfidenceScore: 0,
    minTransferMatchScore: 0.8,
    minStatusConfidenceScore: 0.8,
    maxReplayRiskScore: 0.4,
    minCompensationTriggerSafetyScore: 0.9,
    minReconciliationConfidenceScore: 0.8,
    minReconciliationSafetyScore: 0.82,
    active: true
  }
];

export function getProviderReconciliationRule(
  provider: string
): ProviderReconciliationRuleSet | null {
  return (
    PROVIDER_RECONCILIATION_RULES.find(
      (rule) => rule.active && rule.provider === provider
    ) ?? null
  );
}
