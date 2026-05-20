import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type FinancialReconciliationScope =
  | "global_daily"
  | "coin_daily"
  | "provider_daily"
  | "wallet_daily"
  | "campaign_daily";

export type FinancialReconciliationStatus =
  | "reconciliation_created"
  | "reconciliation_running"
  | "reconciliation_completed"
  | "reconciliation_completed_with_warnings"
  | "reconciliation_failed"
  | "reconciliation_requires_review";

export type FinancialReconciliationSeverity = "info" | "warning" | "danger" | "critical";

export type FinancialReconciliationOutcome =
  | "reconciliation_clean"
  | "reconciliation_warning"
  | "reconciliation_failed"
  | "reconciliation_critical"
  | "reconciliation_requires_review";

export type FinancialReconciliationAnomalyType =
  | "ledger_wallet_delta"
  | "ledger_value_lot_delta"
  | "external_transfer_debit_delta"
  | "provider_transfer_delta"
  | "compensation_reversal_delta"
  | "campaign_reserve_delta"
  | "negative_platform_liability"
  | "unknown_provider_exposure"
  | "stale_pending_payout_exposure"
  | "unreconciled_failed_provider_exposure"
  | "report_generation_incomplete";

export interface FinancialReconciliationTotals {
  ledgerCreditTotal: number;
  ledgerDebitTotal: number;
  ledgerNetTotal: number;
  ledgerPostedCreditTotal: number;
  ledgerPostedDebitTotal: number;
  ledgerPendingCreditTotal: number;
  ledgerPendingDebitTotal: number;
  ledgerReversalTotal: number;

  walletAvailableTotal: number;
  walletPendingTotal: number;
  walletReservedTotal: number;
  walletTotalLiability: number;

  activeValueLotTotal: number;
  pendingValueLotTotal: number;
  expiredValueLotTotal: number;
  consumedValueLotTotal: number;

  externalTransferRequestedTotal: number;
  externalTransferSucceededTotal: number;
  externalTransferFailedTotal: number;
  externalTransferPendingTotal: number;
  externalTransferUnknownTotal: number;

  providerReportedSucceededTotal: number;
  providerReportedFailedTotal: number;
  providerReportedPendingTotal: number;
  providerReportedUnknownTotal: number;

  compensationCreatedTotal: number;
  compensationCompletedTotal: number;
  compensationFailedTotal: number;
  compensationBlockedTotal: number;

  campaignBudgetTotal: number;
  campaignReservedTotal: number;
  campaignSpentTotal: number;
  campaignReleasedTotal: number;

  userAvailableLiability: number;
  userPendingLiability: number;
  userReservedLiability: number;
  providerOutstandingLiability: number;
  campaignOutstandingLiability: number;
  compensationOutstandingLiability: number;
  totalPlatformLiability: number;
}

export interface FinancialReconciliationDeltas {
  ledgerVsWalletDelta: number;
  ledgerVsValueLotDelta: number;
  debitVsExternalTransferDelta: number;
  providerVsExternalTransferDelta: number;
  compensationVsReversalDelta: number;
  campaignBudgetVsReserveDelta: number;
  liabilityDelta: number;
}

export interface FinancialReconciliationAnomaly {
  anomalyId: string;
  anomalyType: FinancialReconciliationAnomalyType;
  severity: FinancialReconciliationSeverity;
  title: string;
  summary: string;
  amountDelta: number;
  linkedObjectIds: Record<string, string | null>;
  evidence: Json;
  reasonCodes: string[];
}

export interface FinancialReconciliationSignalInput {
  reportObjectId: string;
  reportScope: FinancialReconciliationScope;

  reportDate: string;
  periodStart: string;
  periodEnd: string;

  coinCode?: string | null;
  provider?: string | null;
  currencyCode?: string | null;

  totals: FinancialReconciliationTotals;
  deltas: FinancialReconciliationDeltas;
  anomalies: FinancialReconciliationAnomaly[];

  sourceEventIds: string[];

  generatedBy: string;
  now: string;
  metadata?: Json;
}

export interface FinancialReconciliationRuleSet {
  reportScope: FinancialReconciliationScope;

  epsilon: number;

  createsOperationalAlert: boolean;
  createsReviewCase: boolean;

  minConfidenceScore: number;
  warningRiskScore: number;
  dangerRiskScore: number;
  criticalRiskScore: number;

  active: boolean;
}

export interface FinancialReconciliationEvaluationResult {
  status: FinancialReconciliationOutcome;
  dbStatus: FinancialReconciliationStatus;
  severity: FinancialReconciliationSeverity;

  reportScope: FinancialReconciliationScope;
  reportDate: string;

  anomalyCount: number;
  criticalAnomalyCount: number;

  reconciliationConfidenceScore: number;
  financialRiskScore: number;
  reportIntegrityScore: number;

  clean: boolean;
  warning: boolean;
  failed: boolean;
  critical: boolean;
  requiresReview: boolean;

  shouldCreateOperationalAlert: boolean;
  shouldCreateReviewCase: boolean;

  reasons: string[];

  financialReconciliationStartedEvent: AlphabetEvent;
  financialReconciliationCompletedEvent?: AlphabetEvent | null;
  financialReconciliationWarningEvent?: AlphabetEvent | null;
  financialReconciliationFailedEvent?: AlphabetEvent | null;
  financialReconciliationCriticalEvent?: AlphabetEvent | null;
  financialReconciliationReviewRequiredEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface FinancialReconciliationJobResult {
  ok: boolean;
  resultPayload: Json;
  scannedObjectCounts: Record<string, number>;
  mutationCounts: Record<string, number>;
  sourceEventIds: string[];
  createdAlertIds: string[];
  createdReviewCaseIds: string[];
  reasonCodes: string[];
  retryable: boolean;
}
