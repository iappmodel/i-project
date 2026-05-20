import type { AlphabetEvent } from "./event.types";
import type { Json } from "./database.types";

export type WalletInvariantType =
  | "wallet_balance_mismatch"
  | "wallet_account_balance_mismatch"
  | "wallet_negative_available_balance"
  | "wallet_negative_pending_balance"
  | "wallet_negative_reserved_balance"
  | "ledger_sum_mismatch"
  | "value_lot_sum_mismatch"
  | "value_lot_without_ledger"
  | "ledger_without_value_lot"
  | "reversal_without_original"
  | "reversal_amount_mismatch"
  | "duplicate_reversal_detected"
  | "withdrawal_debit_without_external_transfer"
  | "external_transfer_without_debit"
  | "external_transfer_amount_mismatch"
  | "compensation_without_original_ledger"
  | "compensation_without_reversal_ledger"
  | "campaign_reserve_mismatch"
  | "impossible_wallet_state";

export type WalletInvariantSeverity = "info" | "warning" | "danger" | "critical";

export type WalletInvariantStatus =
  | "invariant_passed"
  | "invariant_failed"
  | "invariant_warning"
  | "invariant_skipped";

export type WalletInvariantOutcomeStatus =
  | "invariant_pass"
  | "invariant_warn"
  | "invariant_fail"
  | "invariant_critical"
  | "invariant_skip";

export type WalletInvariantScanScope =
  | "single_wallet"
  | "single_wallet_account"
  | "single_user"
  | "global_batch"
  | "external_transfer"
  | "compensation";

export interface WalletInvariantLinkedObjectIds {
  userId?: string | null;
  walletId?: string | null;
  walletAccountId?: string | null;
  ledgerEntryId?: string | null;
  originalLedgerEntryId?: string | null;
  reversalLedgerEntryId?: string | null;
  valueLotId?: string | null;
  externalTransferId?: string | null;
  compensationId?: string | null;
  campaignId?: string | null;
  executionRequestId?: string | null;
  pipelineId?: string | null;
  sagaId?: string | null;
}

export interface WalletInvariantComputedBalances {
  computedAvailableBalance?: number | null;
  computedPendingBalance?: number | null;
  computedReservedBalance?: number | null;
  computedTotalBalance?: number | null;

  storedAvailableBalance?: number | null;
  storedPendingBalance?: number | null;
  storedReservedBalance?: number | null;
  storedTotalBalance?: number | null;

  availableDelta?: number | null;
  pendingDelta?: number | null;
  reservedDelta?: number | null;
  totalDelta?: number | null;
}

export interface WalletInvariantRiskScores {
  financialImpactScore: number;
  userImpactScore: number;
  exploitabilityScore: number;
  recurrenceRiskScore: number;
  confidenceScore: number;
  repairComplexityScore: number;
}

export interface WalletInvariantSignalInput {
  invariantType: WalletInvariantType;
  scanScope: WalletInvariantScanScope;

  linkedObjectIds: WalletInvariantLinkedObjectIds;
  balances: WalletInvariantComputedBalances;

  riskScores: WalletInvariantRiskScores;

  evidence: Json;
  redactedEvidence: Json;

  sourceEventIds: string[];

  mismatchDetected: boolean;
  negativeBalanceDetected: boolean;
  moneyMovementAffected: boolean;
  externalProviderAffected: boolean;
  userVisibleAffected: boolean;
  allowNegative: boolean;

  now: string;
  metadata?: Json;
}

export interface WalletInvariantRuleSet {
  invariantType: WalletInvariantType;

  defaultSeverity: WalletInvariantSeverity;
  createsOperationalAlert: boolean;
  createsReviewCase: boolean;

  epsilon: number;

  minConfidenceScore: number;
  warnSeverityScore: number;
  failSeverityScore: number;
  criticalSeverityScore: number;

  active: boolean;
}

export interface WalletInvariantEvaluationResult {
  status: WalletInvariantOutcomeStatus;

  invariantType: WalletInvariantType;
  scanScope: WalletInvariantScanScope;

  severity: WalletInvariantSeverity;
  dbStatus: WalletInvariantStatus;

  invariantSeverityScore: number;
  invariantConfidenceScore: number;

  passed: boolean;
  warning: boolean;
  failed: boolean;
  critical: boolean;
  skipped: boolean;

  shouldCreateOperationalAlert: boolean;
  shouldCreateReviewCase: boolean;

  reasons: string[];

  walletInvariantScanStartedEvent: AlphabetEvent;
  walletInvariantPassedEvent?: AlphabetEvent | null;
  walletInvariantWarningEvent?: AlphabetEvent | null;
  walletInvariantFailedEvent?: AlphabetEvent | null;
  walletInvariantCriticalEvent?: AlphabetEvent | null;
  walletInvariantScanCompletedEvent?: AlphabetEvent | null;

  metadata: Json;
}

export interface WalletInvariantScannerResult {
  ok: boolean;
  resultPayload: Json;
  /** Present when `ok` is false for scheduled-job / worker surfaces. */
  errorPayload?: Json | null;
  scannedObjectCounts: Record<string, number>;
  mutationCounts: Record<string, number>;
  sourceEventIds: string[];
  createdAlertIds: string[];
  createdReviewCaseIds: string[];
  reasonCodes: string[];
  retryable: boolean;
}
