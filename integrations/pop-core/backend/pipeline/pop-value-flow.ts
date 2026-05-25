import type { ProofPacketV0 } from "../types/proof-packet-v0.types.js";
import {
  ProofReviewService,
  type ProofReviewSubmitOptions
} from "../review/proof-review-service.js";
import type { ProofReviewRecord, ProofReviewStore } from "../review/proof-review-store.js";
import { createPendingHoldFromReview } from "../settlement/pending-hold-service.js";
import type { CreatePendingHoldOutcome, PendingHoldRecord } from "../settlement/pending-hold.js";
import type { PendingHoldStore } from "../settlement/pending-hold-store.js";
import {
  createDefaultOfferSettlementTermsProvider,
  type OfferSettlementTermsProvider
} from "../settlement/offer-settlement-terms.js";
import { executePendingHoldRelease } from "../settlement/release-execution-service.js";
import type {
  ExecutePendingHoldReleaseOutcome,
  ExecutePendingHoldReleaseResult
} from "../settlement/release-execution-service.js";
import type { ReleaseExecutionRecord } from "../settlement/release-execution.js";
import type { ReleaseExecutionStore } from "../settlement/release-execution-store.js";
import { postLedgerCreditFromReleaseExecution } from "../settlement/ledger-entry-service.js";
import type {
  PostLedgerCreditFromReleaseExecutionResult,
  PostLedgerCreditOutcome
} from "../settlement/ledger-entry-service.js";
import type { LedgerEntry } from "../settlement/ledger-entry.js";
import type { LedgerEntryStore } from "../settlement/ledger-entry-store.js";
import { applyWalletCreditFromLedgerEntry } from "../settlement/wallet-credit-service.js";
import type {
  ApplyWalletCreditFromLedgerEntryResult,
  ApplyWalletCreditOutcome
} from "../settlement/wallet-credit-service.js";
import type { WalletCreditRecord } from "../settlement/wallet-credit.js";
import type { WalletCreditStore } from "../settlement/wallet-credit-store.js";
import {
  computeWalletAvailableBalance,
  type WalletBalanceSnapshot
} from "../settlement/wallet-balance.js";
import type { WalletOwnerResolver } from "../settlement/wallet-owner-resolver.js";
import { InMemoryProofReviewStore } from "../review/proof-review-store.js";
import { InMemoryPendingHoldStore } from "../settlement/pending-hold-store.js";
import { InMemoryReleaseExecutionStore } from "../settlement/release-execution-store.js";
import { InMemoryLedgerEntryStore } from "../settlement/ledger-entry-store.js";
import { InMemoryWalletCreditStore } from "../settlement/wallet-credit-store.js";

export const POP_VALUE_FLOW_V1 = "POP_VALUE_FLOW_V1" as const;

export type PopValueFlowVersion = typeof POP_VALUE_FLOW_V1;

export interface PopValueFlowStores {
  reviewStore: ProofReviewStore;
  holdStore: PendingHoldStore;
  releaseExecutionStore: ReleaseExecutionStore;
  ledgerStore: LedgerEntryStore;
  walletCreditStore: WalletCreditStore;
  offerTermsProvider: OfferSettlementTermsProvider;
}

export interface PopValueFlowOptions extends ProofReviewSubmitOptions {
  stores?: PopValueFlowStores;
  holdCreatedAt?: string;
  executedAt?: string;
  postedAt?: string;
  creditedAt?: string;
  ownerResolver?: WalletOwnerResolver;
}

export interface PopValueFlowStageOutcomes {
  review: "submitted" | "existing";
  hold: CreatePendingHoldOutcome;
  release: ExecutePendingHoldReleaseOutcome;
  ledger: PostLedgerCreditOutcome;
  wallet: ApplyWalletCreditOutcome;
}

export interface PopValueFlowResult {
  valueFlowVersion: PopValueFlowVersion;
  sessionId: string;
  sourceRef: string;
  review: ProofReviewRecord;
  hold: PendingHoldRecord;
  releaseExecution: ReleaseExecutionRecord;
  ledgerEntry: LedgerEntry;
  walletCredit: WalletCreditRecord;
  balance: WalletBalanceSnapshot;
  outcomes: PopValueFlowStageOutcomes;
}

export class PopValueFlowSkippedError extends Error {
  readonly stage: string;
  readonly sessionId: string;
  readonly skipReason?: string;

  constructor(stage: string, sessionId: string, skipReason?: string) {
    super(
      skipReason
        ? `POP value flow skipped at ${stage} for sessionId ${sessionId}: ${skipReason}`
        : `POP value flow skipped at ${stage} for sessionId ${sessionId}`
    );
    this.name = "PopValueFlowSkippedError";
    this.stage = stage;
    this.sessionId = sessionId;
    this.skipReason = skipReason;
  }
}

export function createDefaultPopValueFlowStores(): PopValueFlowStores {
  return {
    reviewStore: new InMemoryProofReviewStore(),
    holdStore: new InMemoryPendingHoldStore(),
    releaseExecutionStore: new InMemoryReleaseExecutionStore(),
    ledgerStore: new InMemoryLedgerEntryStore(),
    walletCreditStore: new InMemoryWalletCreditStore(),
    offerTermsProvider: createDefaultOfferSettlementTermsProvider()
  };
}

function assertHoldResult(
  result: ReturnType<typeof createPendingHoldFromReview>,
  sessionId: string
): PendingHoldRecord {
  if (result.outcome === "skipped") {
    throw new PopValueFlowSkippedError("hold", sessionId, result.skipReason);
  }
  if (!result.hold) {
    throw new PopValueFlowSkippedError("hold", sessionId, "missing_hold_record");
  }
  return result.hold;
}

function assertReleaseResult(
  result: ExecutePendingHoldReleaseResult,
  sessionId: string
): ReleaseExecutionRecord {
  if (result.outcome === "skipped") {
    throw new PopValueFlowSkippedError("release", sessionId, result.skipReason);
  }
  if (!result.execution) {
    throw new PopValueFlowSkippedError("release", sessionId, "missing_execution_record");
  }
  return result.execution;
}

function assertLedgerResult(
  result: PostLedgerCreditFromReleaseExecutionResult,
  sessionId: string
): LedgerEntry {
  if (!result.entry) {
    throw new PopValueFlowSkippedError("ledger", sessionId, "missing_ledger_entry");
  }
  return result.entry;
}

export function runPopValueFlow(
  packet: ProofPacketV0,
  options?: PopValueFlowOptions
): PopValueFlowResult {
  const stores = options?.stores ?? createDefaultPopValueFlowStores();
  const sessionId = packet.sessionId;

  const existingReview = stores.reviewStore.getBySessionId(sessionId);
  const reviewService = new ProofReviewService(stores.reviewStore);
  const review =
    existingReview ??
    reviewService.submitProofPacketForReview(packet, {
      artifactId: options?.artifactId,
      packetId: options?.packetId,
      submittedAt: options?.submittedAt
    });
  const reviewOutcome = existingReview ? "existing" : "submitted";

  const holdResult = createPendingHoldFromReview(review, {
    store: stores.holdStore,
    offerTermsProvider: stores.offerTermsProvider,
    createdAt: options?.holdCreatedAt
  });
  const hold = assertHoldResult(holdResult, sessionId);

  const releaseResult = executePendingHoldRelease(hold, {
    store: stores.releaseExecutionStore,
    executedAt: options?.executedAt
  });
  const releaseExecution = assertReleaseResult(releaseResult, sessionId);

  const ledgerResult = postLedgerCreditFromReleaseExecution(releaseExecution, {
    store: stores.ledgerStore,
    postedAt: options?.postedAt
  });
  const ledgerEntry = assertLedgerResult(ledgerResult, sessionId);

  const walletResult = applyWalletCreditFromLedgerEntry(ledgerEntry, {
    walletCreditStore: stores.walletCreditStore,
    holdStore: stores.holdStore,
    reviewStore: stores.reviewStore,
    ownerResolver: options?.ownerResolver,
    creditedAt: options?.creditedAt
  });

  const balance = computeWalletAvailableBalance(
    walletResult.walletOwnerRef,
    stores.walletCreditStore,
    walletResult.credit.currency
  );

  const sourceRef = releaseExecution.executionRef;

  return {
    valueFlowVersion: POP_VALUE_FLOW_V1,
    sessionId,
    sourceRef,
    review,
    hold,
    releaseExecution,
    ledgerEntry,
    walletCredit: walletResult.credit,
    balance,
    outcomes: {
      review: reviewOutcome,
      hold: holdResult.outcome,
      release: releaseResult.outcome,
      ledger: ledgerResult.outcome,
      wallet: walletResult.outcome
    }
  };
}
