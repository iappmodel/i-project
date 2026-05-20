import type { AlphabetEvent } from "./event.types";
import type { CoinCode } from "./coin.types";
import type { Json } from "./database.types";

export type ExternalTransferType =
  | "withdrawal_payout"
  | "creator_payout"
  | "business_refund"
  | "grant_payout"
  | "campaign_refund"
  | "manual_payout";

export type ExternalTransferProvider =
  | "mock"
  | "stripe"
  | "paypal"
  | "bank_ach"
  | "bank_wire"
  | "crypto"
  | "internal";

export type ExternalTransferStatus =
  | "transfer_created"
  | "transfer_validating"
  | "transfer_blocked"
  | "transfer_ready"
  | "provider_request_created"
  | "provider_request_sent"
  | "provider_pending"
  | "provider_succeeded"
  | "provider_failed"
  | "provider_canceled"
  | "provider_unknown"
  | "compensation_required"
  | "transfer_completed"
  | "transfer_failed"
  | "transfer_requires_review";

export type ExternalTransferOutcomeStatus =
  | "transfer_ready"
  | "transfer_blocked"
  | "transfer_requires_review"
  | "transfer_send_to_provider"
  | "transfer_provider_pending"
  | "transfer_completed"
  | "transfer_failed"
  | "transfer_compensation_required"
  | "transfer_unknown";

export interface ExternalTransferRiskScores {
  transferEligibilityScore: number;
  destinationConfidenceScore: number;
  providerReadinessScore: number;
  complianceScore: number;
  transferFraudRisk: number;
  reversalSafetyScore: number;
}

export interface ExternalTransferRecord {
  externalTransferId: string;

  transferType: ExternalTransferType;
  provider: ExternalTransferProvider;
  status: ExternalTransferStatus;

  userId: string;
  walletId?: string | null;
  walletAccountId?: string | null;

  originalExecutionRequestId?: string | null;
  originalLedgerEntryId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;

  amount: number;
  coinCode: string;

  fiatAmount?: number | null;
  fiatCurrency?: string | null;

  providerTransferId?: string | null;
  providerStatus?: string | null;

  providerPayload: Json;
  providerResponse: Json;

  destinationType?: string | null;
  destinationLabel?: string | null;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds: string[];

  riskScores: ExternalTransferRiskScores;
  metadata: Json;

  createdAt: string;
  updatedAt: string;
}

export interface ExternalTransferSignalInput {
  externalTransferId: string;

  transferType: ExternalTransferType;
  provider: ExternalTransferProvider;
  currentStatus: ExternalTransferStatus;

  userId: string;
  walletId?: string | null;
  walletAccountId?: string | null;

  originalExecutionRequestId?: string | null;
  originalLedgerEntryId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;

  amount: number;
  coinCode: string;

  fiatAmount?: number | null;
  fiatCurrency?: string | null;

  providerTransferId?: string | null;
  providerStatus?: string | null;

  providerPayload: Json;
  providerResponse: Json;

  destinationType?: string | null;
  destinationLabel?: string | null;

  idempotencyKey?: string | null;
  dedupeKey?: string | null;

  sourceEventIds: string[];

  riskScores: ExternalTransferRiskScores;

  providerRequestCreated: boolean;
  providerRequestSent: boolean;
  providerPending: boolean;
  providerSucceeded: boolean;
  providerFailed: boolean;
  providerCanceled: boolean;
  providerUnknown: boolean;

  internalDebitExists: boolean;
  compensationAlreadyCreated: boolean;

  reviewApproved: boolean;
  cancelRequested: boolean;

  now: string;
  metadata?: Json;
}

export interface ExternalTransferRuleSet {
  transferType: ExternalTransferType;

  requiresOriginalLedgerEntry: boolean;
  requiresInternalDebit: boolean;
  requiresIdempotency: boolean;
  requiresDedupe: boolean;
  requiresProviderTransferIdForCompletion: boolean;
  compensationAllowedOnConfirmedFailure: boolean;
  automaticProviderSendAllowed: boolean;
  automaticRetryAllowed: boolean;

  minTransferEligibilityScore: number;
  minDestinationConfidenceScore: number;
  minProviderReadinessScore: number;
  minComplianceScore: number;
  maxFraudRisk: number;
  minReversalSafetyScore: number;
  minTransferReadinessScore: number;
  minTransferSafetyScore: number;

  active: boolean;
}

export interface ExternalTransferEvaluationResult {
  externalTransferId: string;

  transferType: ExternalTransferType;
  provider: ExternalTransferProvider;
  status: ExternalTransferOutcomeStatus;

  userId: string;
  walletId?: string | null;
  originalLedgerEntryId?: string | null;
  originalExecutionRequestId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;

  coinCode: CoinCode | null;

  transferReadinessScore: number;
  transferSafetyScore: number;

  ready: boolean;
  blocked: boolean;
  requiresReview: boolean;
  sendToProvider: boolean;
  providerPending: boolean;
  completed: boolean;
  failed: boolean;
  compensationRequired: boolean;
  unknown: boolean;

  compensationSafeToCreate: boolean;

  reasons: string[];

  externalTransferCreatedEvent: AlphabetEvent;
  externalTransferValidatingEvent?: AlphabetEvent | null;
  externalTransferBlockedEvent?: AlphabetEvent | null;
  externalTransferReadyEvent?: AlphabetEvent | null;
  externalTransferProviderRequestCreatedEvent?: AlphabetEvent | null;
  externalTransferProviderRequestSentEvent?: AlphabetEvent | null;
  externalTransferProviderPendingEvent?: AlphabetEvent | null;
  externalTransferProviderSucceededEvent?: AlphabetEvent | null;
  externalTransferProviderFailedEvent?: AlphabetEvent | null;
  externalTransferProviderUnknownEvent?: AlphabetEvent | null;
  externalTransferCompensationRequiredEvent?: AlphabetEvent | null;
  externalTransferCompletedEvent?: AlphabetEvent | null;
  externalTransferFailedEvent?: AlphabetEvent | null;
  externalTransferRequiresReviewEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface ExternalTransferProviderRequest {
  externalTransferId: string;
  idempotencyKey: string;
  amount: number;
  coinCode: string;
  fiatAmount?: number | null;
  fiatCurrency?: string | null;
  destinationType?: string | null;
  destinationLabel?: string | null;
  metadata?: Json;
}

export interface ExternalTransferProviderResult {
  ok: boolean;
  providerTransferId?: string | null;
  providerStatus:
    | "created"
    | "pending"
    | "succeeded"
    | "failed"
    | "canceled"
    | "unknown";
  providerResponse: Json;
  failureReason?: string | null;
  retryable: boolean;
}
