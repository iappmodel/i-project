import { describe, expect, it } from "vitest";
import {
  LEDGER_BOUNDARY_V1,
  buildLedgerCreditEntryFromReleaseExecution
} from "../../settlement/ledger-entry.js";
import {
  WALLET_BOUNDARY_V1,
  buildWalletCreditFromLedgerEntry,
  deriveWalletCreditId
} from "../../settlement/wallet-credit.js";
import { createHoldReviewWalletOwnerResolver } from "../../settlement/wallet-owner-resolver.js";
import { InMemoryPendingHoldStore } from "../../settlement/pending-hold-store.js";
import { InMemoryProofReviewStore } from "../../review/proof-review-store.js";
import { buildPendingHoldRecord } from "./pending-hold-store.contract.js";
import { buildReleaseExecutionRecordFixture } from "./release-execution-store.contract.js";

const SESSION_ID = "sess_wallet_credit_builder";

function buildLedgerEntryFixture(
  overrides: {
    sessionId?: string;
    amount?: number;
  } = {}
) {
  const execution = buildReleaseExecutionRecordFixture(overrides);
  return buildLedgerCreditEntryFromReleaseExecution(execution);
}

function buildOwnerFixture(sessionId = SESSION_ID) {
  const hold = buildPendingHoldRecord({ sessionId });
  const holdStore = new InMemoryPendingHoldStore();
  holdStore.save(hold);
  const reviewStore = new InMemoryProofReviewStore();
  const resolver = createHoldReviewWalletOwnerResolver({ holdStore, reviewStore });
  return resolver.resolveBySessionId(sessionId)!;
}

describe("deriveWalletCreditId", () => {
  it("derives wallet_credit_{sourceRef}", () => {
    expect(deriveWalletCreditId("release_sess_abc_100_POLICY_V1")).toBe(
      "wallet_credit_release_sess_abc_100_POLICY_V1"
    );
  });
});

describe("buildWalletCreditFromLedgerEntry", () => {
  it("sets boundaryVersion to WALLET_BOUNDARY_V1", () => {
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID });
    const owner = buildOwnerFixture();

    const credit = buildWalletCreditFromLedgerEntry(ledger, owner);

    expect(credit.boundaryVersion).toBe(WALLET_BOUNDARY_V1);
  });

  it("sets sourceBoundaryVersion to LEDGER_BOUNDARY_V1", () => {
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID });
    const owner = buildOwnerFixture();

    const credit = buildWalletCreditFromLedgerEntry(ledger, owner);

    expect(credit.sourceBoundaryVersion).toBe(LEDGER_BOUNDARY_V1);
  });

  it("maps ledger fields and owner identity", () => {
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID, amount: 100 });
    const owner = buildOwnerFixture();

    const credit = buildWalletCreditFromLedgerEntry(ledger, owner);

    expect(credit.walletCreditId).toBe(deriveWalletCreditId(ledger.sourceRef));
    expect(credit.sourceRef).toBe(ledger.sourceRef);
    expect(credit.ledgerEntryId).toBe(ledger.ledgerEntryId);
    expect(credit.sessionId).toBe(ledger.sessionId);
    expect(credit.offerId).toBe(ledger.offerId);
    expect(credit.walletOwnerRef).toBe(owner.walletOwnerRef);
    expect(credit.userId).toBe(owner.userId);
    expect(credit.localUserRef).toBe(owner.localUserRef);
    expect(credit.ownerResolutionSource).toBe("hold");
    expect(credit.amount).toBe(ledger.amount);
    expect(credit.currency).toBe(ledger.currency);
    expect(credit.amountBreakdown).toEqual(ledger.amountBreakdown);
    expect(credit.amountBreakdown).not.toBe(ledger.amountBreakdown);
    expect(credit.creditedAt).toBe(ledger.postedAt);
  });

  it("allows creditedAt override", () => {
    const ledger = buildLedgerEntryFixture({ sessionId: SESSION_ID });
    const owner = buildOwnerFixture();
    const creditedAt = "2026-05-23T13:00:00.000Z";

    const credit = buildWalletCreditFromLedgerEntry(ledger, owner, { creditedAt });

    expect(credit.creditedAt).toBe(creditedAt);
  });

  it("rejects wrong ledger boundaryVersion", () => {
    const ledger = {
      ...buildLedgerEntryFixture(),
      boundaryVersion: "WRONG" as typeof LEDGER_BOUNDARY_V1
    };
    const owner = buildOwnerFixture();

    expect(() => buildWalletCreditFromLedgerEntry(ledger, owner)).toThrow(
      `buildWalletCreditFromLedgerEntry requires boundaryVersion ${LEDGER_BOUNDARY_V1}`
    );
  });

  it("rejects non-pending_wallet_credit status", () => {
    const ledger = buildLedgerEntryFixture();
    const invalidLedger = { ...ledger, status: "credited" as typeof ledger.status };
    const owner = buildOwnerFixture();

    expect(() => buildWalletCreditFromLedgerEntry(invalidLedger, owner)).toThrow(
      'buildWalletCreditFromLedgerEntry requires status "pending_wallet_credit"'
    );
  });

  it("rejects amount < 1", () => {
    const ledger = { ...buildLedgerEntryFixture(), amount: 0 };
    const owner = buildOwnerFixture();

    expect(() => buildWalletCreditFromLedgerEntry(ledger, owner)).toThrow(
      "buildWalletCreditFromLedgerEntry requires amount >= 1"
    );
  });

  it("rejects empty walletOwnerRef", () => {
    const ledger = buildLedgerEntryFixture();
    const owner = {
      ...buildOwnerFixture(),
      walletOwnerRef: ""
    };

    expect(() => buildWalletCreditFromLedgerEntry(ledger, owner)).toThrow(
      "buildWalletCreditFromLedgerEntry requires a non-empty walletOwnerRef"
    );
  });
});
