import {
  LEDGER_BOUNDARY_V1,
  type LedgerEntry
} from "./ledger-entry.js";
import type { ProofReviewStore } from "../review/proof-review-store.js";
import type { PendingHoldStore } from "./pending-hold-store.js";
import {
  buildWalletCreditFromLedgerEntry,
  type WalletCreditRecord
} from "./wallet-credit.js";
import {
  InMemoryWalletCreditStore,
  type WalletCreditStore
} from "./wallet-credit-store.js";
import {
  createHoldReviewWalletOwnerResolver,
  type WalletOwnerResolver
} from "./wallet-owner-resolver.js";

export type ApplyWalletCreditOutcome = "credited" | "existing";

export interface ApplyWalletCreditFromLedgerEntryResult {
  outcome: ApplyWalletCreditOutcome;
  sessionId: string;
  walletOwnerRef: string;
  credit: WalletCreditRecord;
}

export interface ApplyWalletCreditFromLedgerEntryOptions {
  walletCreditStore?: WalletCreditStore;
  holdStore?: PendingHoldStore;
  reviewStore?: ProofReviewStore;
  ownerResolver?: WalletOwnerResolver;
  creditedAt?: string;
}

export class WalletOwnerNotFoundError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(`Wallet owner not found for sessionId: ${sessionId}`);
    this.name = "WalletOwnerNotFoundError";
    this.sessionId = sessionId;
  }
}

function validateLedgerEntryForWalletCredit(entry: LedgerEntry): void {
  if (entry.boundaryVersion !== LEDGER_BOUNDARY_V1) {
    throw new Error(
      `applyWalletCreditFromLedgerEntry requires boundaryVersion ${LEDGER_BOUNDARY_V1}`
    );
  }

  if (entry.status !== "pending_wallet_credit") {
    throw new Error(
      'applyWalletCreditFromLedgerEntry requires status "pending_wallet_credit"'
    );
  }

  if (entry.direction !== "credit") {
    throw new Error('applyWalletCreditFromLedgerEntry requires direction "credit"');
  }

  if (!entry.sourceRef || entry.sourceRef.trim().length === 0) {
    throw new Error("applyWalletCreditFromLedgerEntry requires a non-empty sourceRef");
  }

  if (entry.amount < 1) {
    throw new Error("applyWalletCreditFromLedgerEntry requires amount >= 1");
  }
}

export function applyWalletCreditFromLedgerEntry(
  entry: LedgerEntry,
  options?: ApplyWalletCreditFromLedgerEntryOptions
): ApplyWalletCreditFromLedgerEntryResult {
  validateLedgerEntryForWalletCredit(entry);

  const store = options?.walletCreditStore ?? new InMemoryWalletCreditStore();
  const sessionId = entry.sessionId;

  const existing = store.getBySourceRef(entry.sourceRef);
  if (existing) {
    return {
      outcome: "existing",
      sessionId,
      walletOwnerRef: existing.walletOwnerRef,
      credit: existing
    };
  }

  const ownerResolver =
    options?.ownerResolver ??
    (options?.holdStore && options?.reviewStore
      ? createHoldReviewWalletOwnerResolver({
          holdStore: options.holdStore,
          reviewStore: options.reviewStore
        })
      : null);

  if (!ownerResolver) {
    throw new Error(
      "applyWalletCreditFromLedgerEntry requires ownerResolver or both holdStore and reviewStore"
    );
  }

  const owner = ownerResolver.resolveBySessionId(sessionId);
  if (!owner) {
    throw new WalletOwnerNotFoundError(sessionId);
  }

  const credit = buildWalletCreditFromLedgerEntry(entry, owner, {
    creditedAt: options?.creditedAt
  });

  store.save(credit);

  return {
    outcome: "credited",
    sessionId,
    walletOwnerRef: owner.walletOwnerRef,
    credit
  };
}

export class WalletCreditService {
  constructor(
    private readonly walletCreditStore: WalletCreditStore = new InMemoryWalletCreditStore(),
    private readonly ownerResolver?: WalletOwnerResolver
  ) {}

  applyWalletCreditFromLedgerEntry(
    entry: LedgerEntry,
    options?: Omit<
      ApplyWalletCreditFromLedgerEntryOptions,
      "walletCreditStore" | "ownerResolver"
    >
  ): ApplyWalletCreditFromLedgerEntryResult {
    return applyWalletCreditFromLedgerEntry(entry, {
      ...options,
      walletCreditStore: this.walletCreditStore,
      ownerResolver: this.ownerResolver
    });
  }

  getCreditBySourceRef(sourceRef: string): WalletCreditRecord | null {
    return this.walletCreditStore.getBySourceRef(sourceRef);
  }

  listCreditsByOwnerRef(walletOwnerRef: string): WalletCreditRecord[] {
    return this.walletCreditStore.listByOwnerRef(walletOwnerRef);
  }
}
