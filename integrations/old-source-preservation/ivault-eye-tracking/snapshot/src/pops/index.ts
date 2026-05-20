export * from "./types/pops.types";
export * from "./types/pops-events.types";
export * from "./types/pops-decisions.types";
export * from "./types/pops-privacy.types";
export * from "./types/pops-rewards.types";
export * from "./types/pops-trust.types";
export * from "./types/pops-wallet.types";
export * from "./types/pops-campaign.types";
export * from "./types/pops-admin.types";
export * from "./types/pops-dispute.types";

export * from "./constants/pops.constants";
export * from "./constants/pops-reason-codes";
export * from "./constants/pops-proof-levels";
export * from "./constants/pops-session-states";

export * from "./state/pops-state-machine";

export * from "./sdk/pops-client";
export * from "./sdk/pops-client.types";
export * from "./sdk/pops-session-handle";
export * from "./sdk/pops-network";
export * from "./sdk/pops-offline-queue";
export * from "./sdk/pops-device-context";
export * from "./sdk/pops-storage";

export * from "./capture/pops-session-capture";
export * from "./capture/pops-signal-buffer";
export * from "./capture/pops-client-events";

export * from "./hooks/usePopsSession";
export * from "./hooks/usePopsContentProgress";
export * from "./hooks/usePopsInteractionCapture";
export * from "./hooks/usePopsAppState";
export * from "./hooks/usePopsCheckpoint";

export * from "./aggregation/pops-local-aggregate-builder";

export * from "./normalization/pops-event-normalizer";
export * from "./normalization/pops-event-quality.types";
export * from "./normalization/pops-event-quality-reason-codes";

export * from "./preview/pops-session-preview.types";
export * from "./preview/pops-session-preview.service";
export * from "./preview/pops-preview-copy";

export * from "./storage/pops-local-storage.types";
export * from "./storage/pops-local-session-storage";

export * from "./copy/pops-copy-reviewer";

export * from "./demo/pops-demo-ledger.types";
export * from "./demo/usePopsDemoLedger";
export * from "./demo/pops-demo-scenarios";

export * from "./scoring/pops-score-utils";
export * from "./scoring/pops-scoring-model-v1";
export * from "./scoring/pops-score-weights";
export * from "./scoring/pops-score-normalizers";
export * from "./scoring/pops-fraud-risk-v1";
export * from "./scoring/pops-reason-code-engine";
export * from "./scoring/pops-score-explainer";

export * from "./rewards/pops-reward-decision.service";
export * from "./rewards/pops-reward-formula";
export * from "./rewards/pops-reward-reason-codes";
export * from "./rewards/pops-wallet-integration";

export * from "./wallet/pops-wallet-release.service";
export * from "./wallet/pops-wallet-hold-rules";
export * from "./wallet/pops-wallet-copy";

export * from "./wallet-security";

export * from "./trust/pops-trust-impact.service";
export * from "./trust/pops-trust-events";
export * from "./trust/pops-trust-rules";

export * from "./privacy/pops-privacy-receipt.service";
export * from "./privacy/pops-privacy-copy";
export * from "./privacy/pops-retention-policy";
export * from "./privacy/pops-consent-policy";

export * from "./permissions";

export * from "./fallback/pops-fallback.types";
export * from "./fallback/pops-fallback.service";
export * from "./fallback/pops-fallback-rules";
export * from "./fallback/PopsFallbackPrompt";
export * from "./fallback/PopsFallbackStatusCard";

export * from "./campaigns/pops-campaign-requirements.types";
export * from "./campaigns/pops-campaign-requirements.service";
export * from "./campaigns/pops-campaign-validator";
export * from "./campaigns/PopsCampaignRequirementBuilder";

export * from "./visual/pops-visual-presence.types";
export * from "./visual/pops-visual-presence.service";
export * from "./visual/usePopsVisualPresence";
export * from "./visual/pops-visual-privacy";

export * from "./intent/pops-intent.types";
export * from "./intent/pops-intent.service";
export * from "./intent/pops-intent-rules";
export * from "./intent/usePopsIntentCapture";

export * from "./realworld/pops-realworld.types";
export * from "./realworld/pops-location-proof.service";
export * from "./realworld/pops-qr-proof.service";
export * from "./realworld/pops-nfc-proof.service";
export * from "./realworld/pops-merchant-confirmation.service";
export * from "./realworld/pops-realworld-rules";

export * from "./wallet-security/pops-wallet-security.types";
export * from "./wallet-security/pops-wallet-action-proof.service";
export * from "./wallet-security/pops-wallet-action-rules";
export * from "./wallet-security/usePopsWalletAction";

export * from "./economics/pops-economic.types";
export * from "./economics/pops-budget-reconciliation.service";
export * from "./economics/pops-reward-reconciliation.service";
export * from "./economics/pops-economic-audit.service";
export * from "./economics/pops-brand-invoice-export";

export * from "./pricing/pops-pricing.types";
export * from "./pricing/pops-campaign-quality.service";
export * from "./pricing/pops-creator-quality.service";
export * from "./pricing/pops-reward-multiplier.service";
export * from "./pricing/pops-pricing-signal.service";

export * from "./config/pops-config.types";
export * from "./config/pops-config.service";
export * from "./config/pops-feature-flags";
export * from "./config/pops-rollout-rules";
export * from "./config/pops-region-policy";

export * from "./versioning/pops-version.types";
export * from "./versioning/pops-rule-registry";
export * from "./versioning/pops-model-registry";
export * from "./versioning/pops-version-resolver";
export * from "./versioning/pops-replay.service";

export * from "./retention/pops-retention.types";
export * from "./retention/pops-retention-policy.service";
export * from "./retention/pops-deletion.service";
export * from "./retention/pops-anonymization.service";
export * from "./retention/pops-retention.worker";

export * from "./observability/pops-metrics";
export * from "./observability/pops-logger";
export * from "./observability/pops-alerts";
export * from "./observability/pops-dashboard-metrics";

export * from "./security/pops-security.types";
export * from "./security/pops-event-signing";
export * from "./security/pops-replay-protection";
export * from "./security/pops-device-risk";
export * from "./security/pops-abuse-rules";
export * from "./security/pops-session-integrity";

export * from "./ui/PopsStatusChip";
export * from "./ui/PopsVerificationMeter";
export * from "./ui/PopsRewardProgress";
export * from "./ui/PopsMomentVerified";
export * from "./ui/PopsPrivacyReceiptCard";
export * from "./ui/PopsHeldRewardCard";
export * from "./ui/PopsProofLevelBadge";

export * from "./copy/pops-copy-bank";
export * from "./copy/pops-trust-contract";
export * from "./copy/pops-help-center";
export * from "./copy/pops-onboarding-copy";
export * from "./copy/pops-brand-copy";

export * from "./orchestrator/pops-orchestrator";
export * from "./orchestrator/pops-pipeline.types";
export * from "./orchestrator/pops-pipeline-events";
export * from "./capture";
export * from "./hooks";
export * from "./intent";
export * from "./visual";
export * from "./realworld";
export * from "./privacy/pops-privacy-receipt.types";
export * from "./privacy/pops-privacy-receipt.service";
export * from "./privacy/pops-privacy-copy";
export * from "./copy";
export * from "./copy/pops-copy-bank";
export * from "./privacy/pops-retention-policy";
export * from "./retention";
export * from "./privacy/pops-consent-policy";
export * from "./privacy/PopsPrivacyReceiptCard";
export * from "./disputes/pops-dispute.types";
export * from "./disputes/pops-dispute.service";
export * from "./disputes/PopsDisputeFlow";
export * from "./disputes/PopsDisputeStatusCard";
export * from "./campaigns/pops-campaign-requirements.types";
export * from "./campaigns/pops-campaign-requirements.service";
export * from "./campaigns/pops-campaign-validator";
export * from "./pricing";
export * from "./campaigns/PopsCampaignRequirementBuilder";
export * from "./config/pops-config.types";
export * from "./config/pops-config.service";
export * from "./config/pops-feature-flags";
export * from "./config/pops-rollout-rules";
export * from "./config/pops-region-policy";
export * from "./fairness";
export * from "./scoring";
export * from "./security";
export * from "./sdk";
export * from "./observability/pops-metrics";
export * from "./observability/pops-logger";
export * from "./observability/pops-alerts";
export * from "./observability/pops-dashboard-metrics";
export * from "./pops-pipeline-events";
export * from "./pops-pipeline.types";
export * from "./pops-orchestrator";
export * from "./PopsSessionDemo";

// Local sponsored-watch MVP public surface: `pops-local-mvp-surface.ts` (prefer for new imports).
