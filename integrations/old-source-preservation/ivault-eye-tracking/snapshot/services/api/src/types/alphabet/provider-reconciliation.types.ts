import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";
import type {
  ExternalTransferProvider,
  ExternalTransferStatus
} from "./external-transfer.types";

export type ProviderReconciliationSource =
  | "webhook"
  | "polling"
  | "manual_admin_check"
  | "provider_dashboard_import"
  | "system_replay";

export type NormalizedProviderStatus =
  | "provider_created"
  | "provider_pending"
  | "provider_processing"
  | "provider_succeeded"
  | "provider_failed"
  | "provider_canceled"
  | "provider_returned"
  | "provider_reversed"
  | "provider_unknown";

export type ProviderReconciliationStatus =
  | "reconciliation_received"
  | "reconciliation_verified"
  | "reconciliation_unverified"
  | "reconciliation_matched"
  | "reconciliation_unmatched"
  | "reconciliation_applied"
  | "reconciliation_ignored"
  | "reconciliation_requires_review"
  | "reconciliation_failed";

export type ProviderReconciliationOutcomeStatus =
  | "reconciliation_apply_pending"
  | "reconciliation_apply_success"
  | "reconciliation_apply_failure"
  | "reconciliation_apply_unknown"
  | "reconciliation_ignore_duplicate"
  | "reconciliation_unmatched"
  | "reconciliation_requires_review"
  | "reconciliation_failed";

export interface ProviderReconciliationRiskScores {
  sourceTrustScore: number;
  signatureConfidenceScore: number;
  transferMatchScore: number;
  statusConfidenceScore: number;
  replayRiskScore: number;
  compensationTriggerSafetyScore: number;
}

export interface ProviderWebhookVerificationResult {
  verified: boolean;
  signatureConfidenceScore: number;
  reasonCodes: string[];
}

export interface ProviderReconciliationSignalInput {
  reconciliationId: string;

  reconciliationSource: ProviderReconciliationSource;
  provider: ExternalTransferProvider;

  normalizedProviderStatus: NormalizedProviderStatus;
  currentReconciliationStatus: ProviderReconciliationStatus;

  externalTransferId?: string | null;
  providerTransferId?: string | null;

  providerEventId?: string | null;
  providerRawEventType?: string | null;

  providerRawPayload: Json;
  sanitizedProviderPayload: Json;

  signatureVerified: boolean;
  signatureConfidenceScore: number;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds: string[];

  replayDetected: boolean;
  pollingAttemptCount: number;

  externalTransferExists: boolean;
  externalTransferCurrentStatus?: ExternalTransferStatus | null;
  internalDebitExists: boolean;
  compensationAlreadyCreated: boolean;

  riskScores: ProviderReconciliationRiskScores;

  now: string;
  metadata?: Json;
}

export interface ProviderReconciliationRuleSet {
  provider: ExternalTransferProvider;

  requiresWebhookSignature: boolean;
  allowsPolling: boolean;
  allowsManualAdminCheck: boolean;
  duplicateEventIgnored: boolean;

  minSourceTrustScore: number;
  minSignatureConfidenceScore: number;
  minTransferMatchScore: number;
  minStatusConfidenceScore: number;
  maxReplayRiskScore: number;
  minCompensationTriggerSafetyScore: number;
  minReconciliationConfidenceScore: number;
  minReconciliationSafetyScore: number;

  active: boolean;
}

export interface ProviderReconciliationEvaluationResult {
  reconciliationId: string;

  reconciliationSource: ProviderReconciliationSource;
  provider: ExternalTransferProvider;

  status: ProviderReconciliationOutcomeStatus;
  normalizedProviderStatus: NormalizedProviderStatus;

  externalTransferId?: string | null;
  providerTransferId?: string | null;
  providerEventId?: string | null;

  reconciliationConfidenceScore: number;
  reconciliationSafetyScore: number;

  applyPending: boolean;
  applySuccess: boolean;
  applyFailure: boolean;
  applyUnknown: boolean;
  ignoreDuplicate: boolean;
  unmatched: boolean;
  requiresReview: boolean;
  failed: boolean;

  shouldUpdateExternalTransfer: boolean;
  nextExternalTransferStatus?: ExternalTransferStatus | null;

  shouldCompletePipeline: boolean;
  shouldFailPipeline: boolean;
  shouldTriggerCompensation: boolean;
  compensationSafeToCreate: boolean;

  reasons: string[];

  providerReconciliationReceivedEvent: AlphabetEvent;
  providerReconciliationVerifiedEvent?: AlphabetEvent | null;
  providerReconciliationUnverifiedEvent?: AlphabetEvent | null;
  providerReconciliationMatchedEvent?: AlphabetEvent | null;
  providerReconciliationUnmatchedEvent?: AlphabetEvent | null;
  providerReconciliationAppliedEvent?: AlphabetEvent | null;
  providerReconciliationIgnoredEvent?: AlphabetEvent | null;
  providerReconciliationRequiresReviewEvent?: AlphabetEvent | null;
  providerReconciliationFailedEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface ProviderWebhookInput {
  provider: ExternalTransferProvider;
  rawBody: string;
  headers: Record<string, string | null>;
  receivedAt: string;
  /** Defaults to `webhook` when omitted. */
  reconciliationSource?: ProviderReconciliationSource;
  /**
   * Server-side poll / admin import / replay: skips HMAC when caller is trusted internal code.
   * Do not set from public HTTP handlers.
   */
  trustedInternalSource?: boolean;
  /** Polling workers may set this before insert (defaults to 0). */
  pollingAttemptCount?: number;
}

export interface ProviderWebhookNormalizedPayload {
  provider: ExternalTransferProvider;
  providerEventId?: string | null;
  providerRawEventType?: string | null;
  providerTransferId?: string | null;
  normalizedStatus: NormalizedProviderStatus;
  rawPayload: Json;
  sanitizedPayload: Json;
  amount?: number | null;
  currency?: string | null;
  metadata: Json;
}
