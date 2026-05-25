import { describe, expect, it } from "vitest";
import {
  LEDGER_BOUNDARY_V1,
  buildLedgerCreditEntryFromReleaseExecution
} from "../../settlement/ledger-entry.js";
import {
  WALLET_BOUNDARY_V1,
  buildWalletCreditFromLedgerEntry
} from "../../settlement/wallet-credit.js";
import {
  WalletCreditConflictError,
  type WalletCreditStore
} from "../../settlement/wallet-credit-store.js";
import { createHoldReviewWalletOwnerResolver } from "../../settlement/wallet-owner-resolver.js";
import { InMemoryPendingHoldStore } from "../../settlement/pending-hold-store.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";
import { buildReleaseExecutionRecordFixture } from "./release-execution-store.contract.js";

export function buildWalletCreditFixture(
  overrides: {
    sessionId?: string;
    amount?: number;
  } = {}
) {
  const execution = buildReleaseExecutionRecordFixture(overrides);
  const ledger = buildLedgerCreditEntryFromReleaseExecution(execution);
  const hold = buildPendingHoldRecord({ sessionId: ledger.sessionId });
  const holdStore = new InMemoryPendingHoldStore();
  holdStore.save(hold);
  const reviewStore = new InMemoryProofReviewStore();
  const resolver = createHoldReviewWalletOwnerResolver({ holdStore, reviewStore });
  const owner = resolver.resolveBySessionId(ledger.sessionId)!;

  return buildWalletCreditFromLedgerEntry(ledger, owner);
}

export function runWalletCreditStoreContract(
  name: string,
  createStore: () => WalletCreditStore
): void {
  describe(name, () => {
    it("saves and retrieves a record by sourceRef", () => {
      const store = createStore();
      const credit = buildWalletCreditFixture();

      expect(store.save(credit)).toBe(credit);
      expect(store.getBySourceRef(credit.sourceRef)).toEqual(credit);
    });

    it("lists credits by ownerRef", () => {
      const store = createStore();
      const credit = buildWalletCreditFixture();

      store.save(credit);

      expect(store.listByOwnerRef(credit.walletOwnerRef)).toEqual([credit]);
    });

    it("throws WalletCreditConflictError for duplicate sourceRef", () => {
      const store = createStore();
      const credit = buildWalletCreditFixture();

      store.save(credit);

      expect(() => store.save(credit)).toThrow(WalletCreditConflictError);
      expect(() => store.save(credit)).toThrow(
        `Wallet credit already exists for sourceRef: ${credit.sourceRef}`
      );
    });

    it("returns null for missing sourceRef", () => {
      const store = createStore();
      store.save(buildWalletCreditFixture());

      expect(store.getBySourceRef("missing-source-ref")).toBeNull();
    });

    it("returns empty list for missing ownerRef", () => {
      const store = createStore();
      store.save(buildWalletCreditFixture());

      expect(store.listByOwnerRef("missing-owner")).toEqual([]);
    });

    it("persists boundaryVersion and sourceBoundaryVersion on saved records", () => {
      const store = createStore();
      const credit = buildWalletCreditFixture();

      store.save(credit);

      const saved = store.getBySourceRef(credit.sourceRef);
      expect(saved?.boundaryVersion).toBe(WALLET_BOUNDARY_V1);
      expect(saved?.sourceBoundaryVersion).toBe(LEDGER_BOUNDARY_V1);
    });
  });
}
