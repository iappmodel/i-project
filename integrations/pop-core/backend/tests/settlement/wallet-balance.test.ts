import { describe, expect, it } from "vitest";
import { computeWalletAvailableBalance } from "../../settlement/wallet-balance.js";
import { SETTLEMENT_CURRENCY_V1 } from "../../settlement/settlement-amount.constants.js";
import { InMemoryWalletCreditStore } from "../../settlement/wallet-credit-store.js";
import { applyWalletCreditFromLedgerEntry } from "../../settlement/wallet-credit-service.js";
import { InMemoryPendingHoldStore } from "../../settlement/pending-hold-store.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import { buildLedgerEntryFixture } from "./ledger-entry-store.contract.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";
import { buildWalletCreditFixture } from "./wallet-credit-store.contract.js";

const SESSION_ID = "sess_wallet_balance";
const OWNER_REF = "demo-user-001";

describe("computeWalletAvailableBalance", () => {
  it("returns zero balance when no credits exist", () => {
    const store = new InMemoryWalletCreditStore();

    const balance = computeWalletAvailableBalance(OWNER_REF, store);

    expect(balance.walletOwnerRef).toBe(OWNER_REF);
    expect(balance.currency).toBe(SETTLEMENT_CURRENCY_V1);
    expect(balance.availableMinor).toBe(0);
    expect(balance.creditCount).toBe(0);
  });

  it("sums credits for owner", () => {
    const store = new InMemoryWalletCreditStore();
    const credit = buildWalletCreditFixture({ sessionId: SESSION_ID, amount: 100 });
    store.save(credit);

    const balance = computeWalletAvailableBalance(credit.walletOwnerRef, store);

    expect(balance.availableMinor).toBe(100);
    expect(balance.creditCount).toBe(1);
  });

  it("accumulates multiple credits for same owner", () => {
    const store = new InMemoryWalletCreditStore();
    const creditA = buildWalletCreditFixture({ sessionId: "sess_balance_a", amount: 100 });
    const creditB = buildWalletCreditFixture({ sessionId: "sess_balance_b", amount: 50 });

    store.save(creditA);
    store.save(creditB);

    const balance = computeWalletAvailableBalance(creditA.walletOwnerRef, store);

    expect(balance.availableMinor).toBe(150);
    expect(balance.creditCount).toBe(2);
  });

  it("does not double-count on idempotent wallet credit apply", () => {
    const walletStore = new InMemoryWalletCreditStore();
    const holdStore = new InMemoryPendingHoldStore();
    const reviewStore = new InMemoryProofReviewStore();
    const hold = buildPendingHoldRecord({ sessionId: SESSION_ID });
    holdStore.save(hold);
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID, amount: 100 });

    applyWalletCreditFromLedgerEntry(ledger, {
      walletCreditStore: walletStore,
      holdStore,
      reviewStore
    });
    applyWalletCreditFromLedgerEntry(ledger, {
      walletCreditStore: walletStore,
      holdStore,
      reviewStore
    });

    const balance = computeWalletAvailableBalance(hold.localUserRef, walletStore);

    expect(balance.availableMinor).toBe(100);
    expect(balance.creditCount).toBe(1);
  });
});
